import { useEffect, useSyncExternalStore } from "react";
import { clinicApi } from "@/lib/admin/api";

export type DocSectionId = "clinic" | "opg" | "diagnosis" | "treatments" | "other";

interface StoreSnapshot {
  selectedIds: string[];
  order: Record<DocSectionId, string[]>;
}

interface StoreData extends StoreSnapshot {
  history: StoreSnapshot[];
  future: StoreSnapshot[];
  loaded: boolean;
}

const DEFAULT_SELECTED = [
  "fixed:clinic:demo",
  "fixed:clinic:note",
  "fixed:diagnosis:note",
  "fixed:treatments:note",
  "fixed:other:guarantee",
  "fixed:other:ourclinic",
];

function emptyOrder(): Record<DocSectionId, string[]> {
  return {
    clinic: [],
    opg: [],
    diagnosis: [],
    treatments: [],
    other: [],
  };
}

let state: StoreData = {
  selectedIds: [...DEFAULT_SELECTED],
  order: emptyOrder(),
  history: [],
  future: [],
  loaded: false,
};

const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): StoreSnapshot {
  return {
    selectedIds: [...state.selectedIds],
    order: {
      clinic: [...state.order.clinic],
      opg: [...state.order.opg],
      diagnosis: [...state.order.diagnosis],
      treatments: [...state.order.treatments],
      other: [...state.order.other],
    },
  };
}

function applyRemote(raw: Record<string, unknown>) {
  const order = (raw.order ?? {}) as Record<string, string[]>;
  state = {
    ...state,
    selectedIds: Array.isArray(raw.selected_ids) ? raw.selected_ids.map(String) : [...DEFAULT_SELECTED],
    order: {
      clinic: Array.isArray(order.clinic) ? order.clinic.map(String) : [],
      opg: Array.isArray(order.opg) ? order.opg.map(String) : [],
      diagnosis: Array.isArray(order.diagnosis) ? order.diagnosis.map(String) : [],
      treatments: Array.isArray(order.treatments) ? order.treatments.map(String) : [],
      other: Array.isArray(order.other) ? order.other.map(String) : [],
    },
    loaded: true,
  };
  emit();
}

async function loadDocuments(force = false) {
  if (!force && state.loaded) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await clinicApi.documents.get();
      applyRemote(res);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function persist() {
  await clinicApi.documents.save({
    selected_ids: state.selectedIds,
    order: state.order,
  });
}

function commit(next: Partial<Pick<StoreData, "selectedIds" | "order">>) {
  state = {
    ...state,
    ...next,
    history: [...state.history, snapshot()].slice(-50),
    future: [],
  };
  emit();
}

export function useSelectedIds() {
  useEffect(() => {
    void loadDocuments();
  }, []);
  return useSyncExternalStore(subscribe, () => state.selectedIds, () => state.selectedIds);
}

export function useSectionOrder() {
  useEffect(() => {
    void loadDocuments();
  }, []);
  return useSyncExternalStore(subscribe, () => state.order, () => state.order);
}

export function useDocsHistoryState() {
  useEffect(() => {
    void loadDocuments();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => ({ canUndo: state.history.length > 0, canRedo: state.future.length > 0 }),
    () => ({ canUndo: state.history.length > 0, canRedo: state.future.length > 0 }),
  );
}

export const documentsStore = {
  async reload() {
    await loadDocuments(true);
  },

  toggle(id: string) {
    const exists = state.selectedIds.includes(id);
    commit({
      selectedIds: exists
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id],
    });
    void persist();
  },

  reorder(section: DocSectionId, orderedIds: string[]) {
    commit({
      order: {
        ...state.order,
        [section]: orderedIds,
      },
    });
    void persist();
  },

  reset() {
    state = {
      ...state,
      selectedIds: [...DEFAULT_SELECTED],
      order: emptyOrder(),
      history: [...state.history, snapshot()].slice(-50),
      future: [],
    };
    emit();
    void clinicApi.documents.reset().then((res) => applyRemote(res)).catch(() => void persist());
  },

  undo() {
    const prev = state.history[state.history.length - 1];
    if (!prev) return;
    state = {
      ...state,
      ...prev,
      history: state.history.slice(0, -1),
      future: [snapshot(), ...state.future].slice(0, 50),
    };
    emit();
    void persist();
  },

  redo() {
    const next = state.future[0];
    if (!next) return;
    state = {
      ...state,
      ...next,
      history: [...state.history, snapshot()].slice(-50),
      future: state.future.slice(1),
    };
    emit();
    void persist();
  },
};
