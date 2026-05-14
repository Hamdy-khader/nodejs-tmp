import { useSyncExternalStore } from "react";

export type TemplateCategory = "diagnosis" | "treatments" | "dentists" | "other";

export interface ClinicTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  language: string;
  body: string; // HTML
  order: number;
  updatedAt: number;
}

interface StoreData {
  templates: ClinicTemplate[];
}

const KEY = "brightplans:templates:v1";

const SEED_TREATMENTS = [
  "Post (metal) - general",
  "Crown - general",
  "Implant (one-phase) - general",
  "Implant - general",
  "Healing screw - general",
  "Abutment - general",
  "Bridge - general",
  "Inlay - general",
  "Onlay - general",
  "Veneer - general",
  "Filling - general",
  "Extraction - general",
  "Parapulpal pin - general",
  "Prosthesis removal - general",
  "Root canal treatment - general",
  "Dentures - general",
  "Partial plate removable denture - general",
  "Dentures - general",
  "Temporary denture - general",
  "Reinforcing bar (pier) - general",
  "Telescopic crown - general",
];

const SEED_DIAGNOSIS = [
  "Caries - general",
  "Periodontitis - general",
  "Gingivitis - general",
  "Pulpitis - general",
  "Malocclusion - general",
];

const SEED_DENTISTS = [
  "Welcome letter - general",
  "Treatment summary - general",
  "Referral note - general",
];

const SEED_OTHER = [
  "Consent form - general",
  "Post-op instructions - general",
];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function seed(): StoreData {
  const mk = (title: string, category: TemplateCategory, i: number): ClinicTemplate => ({
    id: uid(),
    title,
    category,
    language: "English",
    body: `<p>${title}</p>`,
    order: i,
    updatedAt: Date.now(),
  });
  const templates: ClinicTemplate[] = [
    ...SEED_TREATMENTS.map((t, i) => mk(t, "treatments", i)),
    ...SEED_DIAGNOSIS.map((t, i) => mk(t, "diagnosis", i)),
    ...SEED_DENTISTS.map((t, i) => mk(t, "dentists", i)),
    ...SEED_OTHER.map((t, i) => mk(t, "other", i)),
  ];
  return { templates };
}

function load(): StoreData {
  if (typeof window === "undefined") return { templates: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as StoreData;
  } catch {
    return { templates: [] };
  }
}

let state: StoreData = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTemplates() {
  return useSyncExternalStore(
    subscribe,
    () => state.templates,
    () => state.templates,
  );
}

export const templatesStore = {
  upsert(input: Partial<ClinicTemplate> & { title: string; category: TemplateCategory }) {
    if (input.id) {
      state = {
        templates: state.templates.map((t) =>
          t.id === input.id ? { ...t, ...input, updatedAt: Date.now() } as ClinicTemplate : t,
        ),
      };
    } else {
      const order =
        Math.max(0, ...state.templates.filter((t) => t.category === input.category).map((t) => t.order)) + 1;
      const t: ClinicTemplate = {
        id: uid(),
        title: input.title,
        category: input.category,
        language: input.language ?? "English",
        body: input.body ?? "",
        order,
        updatedAt: Date.now(),
      };
      state = { templates: [...state.templates, t] };
    }
    persist();
  },
  remove(id: string) {
    state = { templates: state.templates.filter((t) => t.id !== id) };
    persist();
  },
  reorder(category: TemplateCategory, orderedIds: string[]) {
    const map = new Map(orderedIds.map((id, i) => [id, i]));
    state = {
      templates: state.templates.map((t) =>
        t.category === category && map.has(t.id) ? { ...t, order: map.get(t.id)! } : t,
      ),
    };
    persist();
  },
};
