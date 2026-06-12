import { useEffect, useSyncExternalStore } from "react";
import { clinicApi } from "@/lib/admin/api";
import { normalizePricelistData } from "@/lib/treatment-catalog";

export type PriceItem = {
  id: string;
  key: string;
  name: string;
  price: number;
  note?: string;
  usageCount?: number;
  isUsed?: boolean;
  canEditName?: boolean;
  canEditNote?: boolean;
  canDelete?: boolean;
  canEditPrice?: boolean;
};
export type PriceSubGroup = {
  id: string;
  key: string;
  title: string;
  priceLabel?: string;
  items: PriceItem[];
};
export type PriceSection = {
  id: string;
  key: string;
  n: number | null;
  label: string;
  icon: string;
  groups: PriceSubGroup[];
};

let state: PriceSection[] = [];
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toPriceSections(
  raw: Awaited<ReturnType<typeof clinicApi.pricelist.get>>["sections"],
): PriceSection[] {
  const normalized = normalizePricelistData({
    settings: {
      language: "en",
      currency_code: "USD",
      currency_label: "United States dollar",
      currency_symbol: "$",
    },
    sections: raw,
  });

  return normalized.sections.map((section) => ({
    id: section.id,
    key: section.key ?? section.id,
    n: section.n,
    label: section.label,
    icon: section.icon,
    groups: section.groups.map((group) => ({
      id: group.id,
      key: group.key ?? group.id,
      title: group.title,
      priceLabel: group.price_label ?? undefined,
      items: group.items.map((item) => ({
        id: item.id,
        key: item.key ?? item.id,
        name: item.name,
        price: item.price,
        note: item.note || undefined,
        usageCount: item.usage_count,
        isUsed: item.is_used,
        canEditName: item.can_edit_name,
        canEditNote: item.can_edit_note,
        canDelete: item.can_delete,
        canEditPrice: item.can_edit_price,
      })),
    })),
  }));
}

async function loadPricelist(force = false) {
  if (!force && loaded) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await clinicApi.pricelist.get();
      state = toPriceSections(res.sections);
      loaded = true;
      emit();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function usePricelist() {
  useEffect(() => {
    void loadPricelist();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export const pricelistStore = {
  get(): PriceSection[] {
    void loadPricelist();
    return state;
  },

  async reload() {
    await loadPricelist(true);
  },

  getPriceFor(name: string): number {
    if (!name) return 0;
    const target = norm(name);
    for (const section of state) {
      for (const group of section.groups) {
        for (const item of group.items) {
          if (norm(item.name) === target) return item.price || 0;
        }
      }
    }
    for (const section of state) {
      for (const group of section.groups) {
        for (const item of group.items) {
          if (item.price > 0 && target.startsWith(norm(item.name))) return item.price;
        }
      }
    }
    return 0;
  },

  setSections(next: PriceSection[]) {
    state = next;
    emit();
  },
};

export const priceUid = () => Math.random().toString(36).slice(2, 9);
export const makePriceItem = (name: string, price = 0, note = ""): PriceItem => ({
  id: priceUid(),
  name,
  price,
  note,
});
