import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { patientsStore, type TreatmentRow } from "@/lib/patients-store";

interface Step {
  rows: TreatmentRow[];
  label: string;
}

interface Stacks {
  undo: Step[];
  redo: Step[];
}

const stacks = new Map<string, Stacks>();
const listeners = new Set<() => void>();
const EMPTY: Stacks = { undo: [], redo: [] };

function emit() {
  listeners.forEach((listener) => listener());
}

function stacksFor(planId: string) {
  let entry = stacks.get(planId);
  if (!entry) {
    entry = { undo: [], redo: [] };
    stacks.set(planId, entry);
  }
  return entry;
}

function save(planId: string, rows: TreatmentRow[]) {
  void patientsStore.setTreatments(planId, rows).catch(() => {
    toast.error("Could not save treatments. Please save the plan again.");
  });
}

/**
 * Undo/redo for treatment actions (adding, switching a type, Autocorrect,
 * removing). Each step keeps the rows from before the action and the short
 * label shown under the Undo button.
 */
export const treatmentHistory = {
  commit(planId: string, before: TreatmentRow[], after: TreatmentRow[], label: string) {
    const entry = stacksFor(planId);
    stacks.set(planId, { undo: [...entry.undo, { rows: before, label }], redo: [] });
    emit();
    save(planId, after);
  },

  undo(planId: string, current: TreatmentRow[]) {
    const entry = stacksFor(planId);
    const step = entry.undo.at(-1);
    if (!step) return;
    stacks.set(planId, {
      undo: entry.undo.slice(0, -1),
      redo: [...entry.redo, { rows: current, label: step.label }],
    });
    emit();
    save(planId, step.rows);
  },

  redo(planId: string, current: TreatmentRow[]) {
    const entry = stacksFor(planId);
    const step = entry.redo.at(-1);
    if (!step) return;
    stacks.set(planId, {
      undo: [...entry.undo, { rows: current, label: step.label }],
      redo: entry.redo.slice(0, -1),
    });
    emit();
    save(planId, step.rows);
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  snapshot(planId: string | undefined): Stacks {
    return (planId && stacks.get(planId)) || EMPTY;
  },
};

export function useTreatmentHistory(planId: string | undefined) {
  const entry = useSyncExternalStore(
    treatmentHistory.subscribe,
    () => treatmentHistory.snapshot(planId),
    () => EMPTY,
  );
  return {
    canUndo: entry.undo.length > 0,
    undoLabel: entry.undo.at(-1)?.label,
    canRedo: entry.redo.length > 0,
    redoLabel: entry.redo.at(-1)?.label,
  };
}
