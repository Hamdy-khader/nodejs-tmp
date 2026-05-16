import { useSyncExternalStore } from "react";

export type PageSize = "A4" | "Letter" | "Legal";

export interface PageDesign {
  frontCover: { coverImage?: string; title: string; subtitle?: string };
  innerPages: { headerText: string; showFooter: boolean };
  animationPage: { mode: "default" | "custom"; customNote?: string };
  backCover: { backImage?: string; note?: string };
}

export interface PlanSettings {
  language: string;
  pageSize: PageSize;
  priceListDesign: "compact" | "detailed" | "minimal";
  pricePage: {
    showSubtotal: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showTotal: boolean;
    currency: string;
  };
  planSections: {
    showDiagnosis: boolean;
    showTreatments: boolean;
    showAnimation: boolean;
    showDocuments: boolean;
    showOverview: boolean;
  };
  pageDesign: PageDesign;
  updatedAt: number;
}

const KEY = "brightplans:plan-settings:v1";

const defaults: PlanSettings = {
  language: "English (EN)",
  pageSize: "A4",
  priceListDesign: "detailed",
  pricePage: {
    showSubtotal: true,
    showDiscount: true,
    showTax: false,
    showTotal: true,
    currency: "USD",
  },
  planSections: {
    showDiagnosis: true,
    showTreatments: true,
    showAnimation: true,
    showDocuments: true,
    showOverview: true,
  },
  pageDesign: {
    frontCover: { title: "TREATMENT PLAN", subtitle: "[PATIENT NAME]" },
    innerPages: { headerText: "TITLE", showFooter: true },
    animationPage: { mode: "default" },
    backCover: { note: "" },
  },
  updatedAt: Date.now(),
};

function load(): PlanSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as PlanSettings) };
  } catch {
    return defaults;
  }
}

let state: PlanSettings = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePlanSettings() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const planSettingsStore = {
  update(patch: Partial<PlanSettings>) {
    state = { ...state, ...patch, updatedAt: Date.now() };
    persist();
  },
  updatePageDesign<K extends keyof PageDesign>(key: K, patch: Partial<PageDesign[K]>) {
    state = {
      ...state,
      pageDesign: { ...state.pageDesign, [key]: { ...state.pageDesign[key], ...patch } },
      updatedAt: Date.now(),
    };
    persist();
  },
};
