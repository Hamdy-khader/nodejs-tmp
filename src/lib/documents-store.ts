import { useSyncExternalStore } from "react";

export type DocSectionId = "clinic" | "opg" | "diagnosis" | "treatments" | "other";

interface StoreData {
  // Set of selected item IDs (template IDs or synthetic fixed IDs like "fixed:clinic:demo")
  selectedIds: string[];
  // Per-section custom order overrides (subset of ids in their preferred order)
  order: Record<DocSectionId, string[]>;
  history: Pick<StoreData, "selectedIds" | "order">[];
  future: Pick<StoreData, "selectedIds" | "order">[];
}

const KEY = "brightplans:documents:v2";

const DEFAULT_SELECTED = [
  "fixed:clinic:demo",
  "fixed:clinic:note",
  "fixed:diagnosis:note",
  "fixed:treatments:note",
  "fixed:other:guarantee",
  "fixed:other:ourclinic",
];

function seed(): StoreData {
  return {
    selectedIds: [...DEFAULT_SELECTED],
    order: { clinic: [], opg: [], diagnosis: [], treatments: [], other: [] },
    history: [],
    future: [],
  };
}

function load(): StoreData {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as StoreData;
  } catch {
    return seed();
  }
}

let state: StoreData = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function sub(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snap() {
  return {
    selectedIds: [...state.selectedIds],
    order: JSON.parse(JSON.stringify(state.order)) as StoreData["order"],
  };
}

function commit(next: Partial<Pick<StoreData, "selectedIds" | "order">>) {
  state = {
    ...state,
    ...next,
    history: [...state.history, snap()].slice(-50),
    future: [],
  };
  persist();
}

export function useSelectedIds() {
  return useSyncExternalStore(sub, () => state.selectedIds, () => state.selectedIds);
}

export function useSectionOrder() {
  return useSyncExternalStore(sub, () => state.order, () => state.order);
}

export function useDocsHistoryState() {
  return useSyncExternalStore(
    sub,
    () => ({ canUndo: state.history.length > 0, canRedo: state.future.length > 0 }),
    () => ({ canUndo: state.history.length > 0, canRedo: state.future.length > 0 }),
  );
}

export const documentsStore = {
  toggle(id: string) {
    const has = state.selectedIds.includes(id);
    commit({
      selectedIds: has ? state.selectedIds.filter((x) => x !== id) : [...state.selectedIds, id],
    });
  },
  reorder(section: DocSectionId, orderedIds: string[]) {
    commit({ order: { ...state.order, [section]: orderedIds } });
  },
  reset() {
    state = { ...seed(), history: [...state.history, snap()], future: [] };
    persist();
  },
  undo() {
    const prev = state.history[state.history.length - 1];
    if (!prev) return;
    state = {
      ...state,
      ...prev,
      history: state.history.slice(0, -1),
      future: [snap(), ...state.future].slice(0, 50),
    };
    persist();
  },
  redo() {
    const next = state.future[0];
    if (!next) return;
    state = {
      ...state,
      ...next,
      history: [...state.history, snap()],
      future: state.future.slice(1),
    };
    persist();
  },
};
