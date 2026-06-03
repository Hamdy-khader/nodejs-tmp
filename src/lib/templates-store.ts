import { useEffect, useSyncExternalStore } from "react";
import { clinicApi } from "@/lib/admin/api";

export type TemplateCategory = "diagnosis" | "treatments" | "dentists" | "other";

export interface ClinicTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  language: string;
  body: string;
  order: number;
  updatedAt: number;
}

interface StoreData {
  templates: ClinicTemplate[];
  loaded: boolean;
}

let state: StoreData = {
  templates: [],
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

function toTemplate(raw: Record<string, unknown>): ClinicTemplate {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    category: String(raw.category ?? "other") as TemplateCategory,
    language: String(raw.language ?? "English"),
    body: String(raw.body ?? raw.body_html ?? ""),
    order: Number(raw.order ?? raw.display_order ?? 0),
    updatedAt: new Date(String(raw.updated_at ?? new Date().toISOString())).getTime(),
  };
}

async function loadTemplates(force = false) {
  if (typeof window === "undefined") return;
  if (!force && state.loaded) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await clinicApi.templates.list();
      const rows = Array.isArray(res) ? res : (res.data ?? []);
      state = {
        templates: rows.map((row) => toTemplate(row)),
        loaded: true,
      };
      emit();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useTemplates() {
  useEffect(() => {
    void loadTemplates();
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => state.templates,
    () => state.templates,
  );
}

export const templatesStore = {
  async reload() {
    await loadTemplates(true);
  },

  async upsert(input: Partial<ClinicTemplate> & { title: string; category: TemplateCategory }) {
    if (input.id) {
      const updated = await clinicApi.templates.update(input.id, {
        title: input.title,
        category: input.category,
        language: input.language ?? "English",
        body: input.body ?? "",
        order: input.order ?? 0,
      });
      const template = toTemplate(updated);
      state = {
        ...state,
        templates: state.templates.map((item) => (item.id === template.id ? template : item)),
      };
      emit();
      return template;
    }

    const created = await clinicApi.templates.create({
      title: input.title,
      category: input.category,
      language: input.language ?? "English",
      body: input.body ?? "",
      order:
        Math.max(
          0,
          ...state.templates
            .filter((item) => item.category === input.category)
            .map((item) => item.order),
        ) + 1,
    });

    const template = toTemplate(created);
    state = { ...state, templates: [...state.templates, template] };
    emit();
    return template;
  },

  async remove(id: string) {
    await clinicApi.templates.delete(id);
    state = { ...state, templates: state.templates.filter((template) => template.id !== id) };
    emit();
  },

  async reorder(category: TemplateCategory, orderedIds: string[]) {
    await clinicApi.templates.reorder({
      category,
      ordered_ids: orderedIds,
    });

    const indexById = new Map(orderedIds.map((id, index) => [id, index]));
    state = {
      ...state,
      templates: state.templates.map((template) =>
        template.category === category && indexById.has(template.id)
          ? { ...template, order: indexById.get(template.id)! }
          : template,
      ),
    };
    emit();
  },
};
