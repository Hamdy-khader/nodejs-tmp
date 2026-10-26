import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  applyDiagnosis,
  removeDiagnosis,
  setExtraDiagnosis,
  type StatusEntry,
} from "@/lib/dental/diagnosis-engine";
import { diagnosisPatch, planEntries } from "@/lib/dental/plan-diagnosis";
import {
  EXTRA_DIAGNOSIS,
  STATE,
  extraDiagnosisSuffix,
  shortLabel,
  statusLabel,
} from "@/lib/dental/states";
import { patientsStore, type TreatmentPlan } from "@/lib/patients-store";

export interface DetailsTarget {
  stateId: number;
  teeth: number[];
  ts?: number;
  title: string;
  selected: string[];
  editing: boolean;
}

interface HistoryStep {
  entries: StatusEntry[];
  label: string;
}

/**
 * Diagnosis editing for one plan: applying the status buttons to the selected
 * teeth, the details panel that follows, chip editing and undo/redo. Every
 * change is saved straight away, like the rest of the plan.
 */
export function useDiagnosisEditor(plan: TreatmentPlan | undefined) {
  const planId = plan?.id;
  const teeth = plan?.teeth;
  const generalStatuses = plan?.generalStatuses;
  const entries = useMemo(
    () => (teeth ? planEntries(teeth, generalStatuses) : []),
    [teeth, generalStatuses],
  );
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [details, setDetails] = useState<DetailsTarget | null>(null);
  const [activeChip, setActiveChip] = useState<StatusEntry | null>(null);
  const [undo, setUndo] = useState<HistoryStep[]>([]);
  const [redo, setRedo] = useState<HistoryStep[]>([]);

  const save = useCallback(
    (next: StatusEntry[]) => {
      if (planId && teeth) patientsStore.updatePlan(planId, diagnosisPatch(teeth, next));
    },
    [planId, teeth],
  );

  const commit = useCallback(
    (next: StatusEntry[], label: string) => {
      setUndo((stack) => [...stack, { entries, label }]);
      setRedo([]);
      save(next);
    },
    [entries, save],
  );

  const openDetails = (stateId: number, teeth: number[], ts?: number, entry?: StatusEntry) => {
    if (!EXTRA_DIAGNOSIS[stateId]) {
      setDetails(null);
      return;
    }
    setDetails({
      stateId,
      teeth,
      ts,
      title: entry?.baseTitle || statusLabel(stateId),
      selected: entry?.extraDiagnosis ? entry.extraDiagnosis.split(",") : [],
      editing: !!entry,
    });
  };

  /** A status button or dropdown item: applies to the selected teeth. */
  const apply = (stateIds: number[], title?: string) => {
    setActiveChip(null);
    const result = applyDiagnosis(entries, { teeth: selectedTeeth, stateIds, title });
    if (!result.applied) {
      if (result.message) toast(result.message);
      return;
    }
    if (result.message) toast(result.message);
    commit(result.entries, result.undoLabel ?? shortLabel(stateIds[0]));
    setSelectedTeeth([]);
    openDetails(stateIds[0], result.teeth, result.ts);
  };

  /** Free text from the General / Other dialog. */
  const applyCustom = (teeth: number[], text: string) => {
    const stateId = teeth.length ? STATE.customStatus : STATE.general;
    const result = applyDiagnosis(entries, { teeth, stateIds: [stateId], title: text });
    if (!result.applied) return;
    commit(result.entries, shortLabel(stateId));
    setSelectedTeeth([]);
    setDetails(null);
  };

  const remove = (entry: StatusEntry) => {
    if (activeChip === entry) setActiveChip(null);
    setDetails(null);
    commit(removeDiagnosis(entries, entry), shortLabel(entry.stateId));
  };

  /** Clicking a chip selects it and reopens its details for editing. */
  const editChip = (entry: StatusEntry) => {
    setActiveChip(entry);
    setSelectedTeeth([]);
    openDetails(entry.stateId, [entry.toothId], entry.ts, entry);
  };

  const toggleDetail = (option: string) => {
    setDetails((current) => {
      if (!current) return current;
      const multiple = EXTRA_DIAGNOSIS[current.stateId]?.multiple;
      const has = current.selected.includes(option);
      const selected = has
        ? current.selected.filter((value) => value !== option)
        : multiple
          ? [...current.selected, option]
          : [option];
      return { ...current, selected };
    });
  };

  const confirmDetails = () => {
    if (!details) return;
    const next = setExtraDiagnosis(
      entries,
      { ts: details.ts, stateId: details.stateId, teeth: details.teeth },
      details.selected,
      extraDiagnosisSuffix(details.stateId, details.selected),
    );
    commit(next, details.editing ? "edit status" : shortLabel(details.stateId));
    setDetails(null);
    setActiveChip(null);
  };

  const undoLast = () => {
    const step = undo.at(-1);
    if (!step) return;
    setUndo((stack) => stack.slice(0, -1));
    setRedo((stack) => [...stack, { entries, label: step.label }]);
    setDetails(null);
    save(step.entries);
  };

  const redoLast = () => {
    const step = redo.at(-1);
    if (!step) return;
    setRedo((stack) => stack.slice(0, -1));
    setUndo((stack) => [...stack, { entries, label: step.label }]);
    setDetails(null);
    save(step.entries);
  };

  const reset = () => {
    commit([], "reset");
    setDetails(null);
    setActiveChip(null);
    setSelectedTeeth([]);
  };

  return {
    entries,
    selectedTeeth,
    setSelectedTeeth: (teeth: number[]) => {
      setSelectedTeeth(teeth);
      setActiveChip(null);
    },
    details,
    closeDetails: () => setDetails(null),
    activeChip,
    apply,
    applyCustom,
    remove,
    editChip,
    toggleDetail,
    confirmDetails,
    undo: { available: undo.length > 0, label: undo.at(-1)?.label, run: undoLast },
    redo: { available: redo.length > 0, label: redo.at(-1)?.label, run: redoLast },
    reset,
  };
}

export type DiagnosisEditor = ReturnType<typeof useDiagnosisEditor>;
