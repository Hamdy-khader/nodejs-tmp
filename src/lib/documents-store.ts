import { useSyncExternalStore } from "react";

export type DocSectionId = "clinic" | "opg" | "diagnosis" | "treatments" | "other";

export interface DocumentItem {
  id: string;
  section: DocSectionId;
  title: string;
  selected: boolean;
  order: number;
  hasVideo?: boolean;
  badge?: string;
}

interface StoreData {
  items: DocumentItem[];
  history: DocumentItem[][];
  future: DocumentItem[][];
}

const KEY = "brightplans:documents:v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const SEED: Omit<DocumentItem, "id" | "order">[] = [
  { section: "clinic", title: "Demo Dentist", selected: true, hasVideo: true },
  { section: "clinic", title: "Custom note", selected: true },
  { section: "clinic", title: "Our Clinic", selected: false },
  { section: "clinic", title: "Guarantee and Brief Info", selected: false },

  { section: "opg", title: "OPG X-Ray (panoramic)", selected: true },
  { section: "opg", title: "Periapical X-Rays", selected: false },

  { section: "diagnosis", title: "Bridge, general", selected: true },
  { section: "diagnosis", title: "Caries, general", selected: false },
  { section: "diagnosis", title: "Missing tooth", selected: false },

  { section: "treatments", title: "Inlay, Onlay, Crown", selected: true },
  { section: "treatments", title: "Crowns (porcelain fused to metal)", selected: true, hasVideo: true },
  { section: "treatments", title: "Implant + Crown", selected: true, hasVideo: true },
  { section: "treatments", title: "Bridge", selected: false },
  { section: "treatments", title: "Root canal treatment", selected: false, hasVideo: true },

  { section: "other", title: "Dental post", selected: false },
  { section: "other", title: "Dental veneers", selected: false },
  { section: "other", title: "Implant information", selected: true },
  { section: "other", title: "Things to do after extraction", selected: true },
];

function seed(): StoreData {
  const items: DocumentItem[] = SEED.map((s, i) => ({ ...s, id: uid(), order: i }));
  return { items, history: [], future: [] };
}

function load(): StoreData {
  if (typeof window === "undefined") return { items: [], history: [], future: [] };
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

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot() {
  return JSON.parse(JSON.stringify(state.items)) as DocumentItem[];
}

function commit(nextItems: DocumentItem[]) {
  state = {
    items: nextItems,
    history: [...state.history, snapshot()].slice(-50),
    future: [],
  };
  persist();
}

export function useDocuments() {
  return useSyncExternalStore(subscribe, () => state.items, () => state.items);
}

export function useDocsHistoryState() {
  return useSyncExternalStore(
    subscribe,
    () => ({ canUndo: state.history.length > 0, canRedo: state.future.length > 0 }),
    () => ({ canUndo: state.history.length > 0, canRedo: state.future.length > 0 }),
  );
}

export const documentsStore = {
  toggle(id: string) {
    commit(state.items.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  },
  reorder(section: DocSectionId, orderedIds: string[]) {
    const map = new Map(orderedIds.map((id, i) => [id, i]));
    const next = state.items.map((it) =>
      it.section === section && map.has(it.id) ? { ...it, order: map.get(it.id)! } : it,
    );
    commit(next);
  },
  reset() {
    const s = seed();
    state = { items: s.items, history: [...state.history, snapshot()], future: [] };
    persist();
  },
  undo() {
    const prev = state.history[state.history.length - 1];
    if (!prev) return;
    state = {
      items: prev,
      history: state.history.slice(0, -1),
      future: [snapshot(), ...state.future].slice(0, 50),
    };
    persist();
  },
  redo() {
    const next = state.future[0];
    if (!next) return;
    state = {
      items: next,
      history: [...state.history, snapshot()],
      future: state.future.slice(1),
    };
    persist();
  },
};
