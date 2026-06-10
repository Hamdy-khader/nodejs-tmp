import { useSyncExternalStore } from "react";

export interface PatientTab {
  patientId: string;
  name: string;
  planId?: string;
  planName?: string;
}

const KEY = "treatly:tabs:v1";

function load(): PatientTab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PatientTab[]) : [];
  } catch {
    return [];
  }
}

let tabs: PatientTab[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(KEY, JSON.stringify(tabs));
  }
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTabs() {
  return useSyncExternalStore(
    subscribe,
    () => tabs,
    () => tabs,
  );
}

export const tabsStore = {
  open(tab: PatientTab) {
    const idx = tabs.findIndex((t) => t.patientId === tab.patientId);
    if (idx >= 0) {
      tabs = tabs.map((t, i) => (i === idx ? { ...t, ...tab } : t));
    } else {
      tabs = [...tabs, tab];
    }
    persist();
  },
  close(patientId: string) {
    tabs = tabs.filter((t) => t.patientId !== patientId);
    persist();
  },
  rename(patientId: string, name: string) {
    tabs = tabs.map((t) => (t.patientId === patientId ? { ...t, name } : t));
    persist();
  },
};
