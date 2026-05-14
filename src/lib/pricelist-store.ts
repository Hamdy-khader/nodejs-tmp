import { useSyncExternalStore } from "react";

export type PriceItem = { id: string; name: string; price: number; note?: string };
export type PriceSubGroup = { id: string; title: string; priceLabel?: string; items: PriceItem[] };
/** icon is a string key, resolved in the UI to an icon component. */
export type PriceSection = {
  id: string;
  n: number | null;
  label: string;
  icon: string;
  groups: PriceSubGroup[];
};

const STORAGE_KEY = "brightplans:pricelist:v1";

const uid = () => Math.random().toString(36).slice(2, 9);
const mk = (name: string, price = 0, note = ""): PriceItem => ({ id: uid(), name, price, note });

const INITIAL: PriceSection[] = [
  { id: "extraction", n: 1, label: "Extraction", icon: "scissors", groups: [
    { id: uid(), title: "Extraction", items: [
      mk("Wisdom Extraction", 100), mk("Surgical extraction", 200), mk("Remove existing implant", 0),
    ]},
    { id: uid(), title: "Other treatments", items: [] },
  ]},
  { id: "prosthesis", n: 2, label: "Prosthesis removal", icon: "layers", groups: [
    { id: uid(), title: "Prosthesis removal", items: [mk("Bridge removal", 10), mk("Crown removal", 10)]},
  ]},
  { id: "filling", n: 3, label: "Filling", icon: "droplet", groups: [
    { id: uid(), title: "Filling", items: [mk("Filling", 150), mk("Temporary filling", 0), mk("Medicated filling", 0)]},
    { id: uid(), title: "Inlay", items: [mk("Inlay", 300)] },
    { id: uid(), title: "Onlay", items: [mk("Onlay", 300)] },
    { id: uid(), title: "Other treatments", items: [] },
  ]},
  { id: "dentures", n: 4, label: "Dentures", icon: "smile", groups: [
    { id: uid(), title: "Dentures", priceLabel: "Package price", items: [
      mk("Temporary bridge", 20), mk("Temporary crown", 20), mk("Overdenture", 0), mk("Overdentures", 0),
    ]},
    { id: uid(), title: "Other treatments", items: [mk("Preci-vertix", 0)] },
  ]},
  { id: "rct", n: 5, label: "Root canal treatment", icon: "activity", groups: [
    { id: uid(), title: "Root canal treatments (by roots)", items: [
      mk("Root canal treatment - 1 root", 400),
      mk("Root canal treatment - 2 root", 500),
      mk("Root canal treatment - 3 root", 600),
      mk("Root canal re-treatment", 500),
    ]},
    { id: uid(), title: "Post (composite)", items: [mk("Post", 200)] },
    { id: uid(), title: "Post (metal)", items: [] },
    { id: uid(), title: "Other treatments", items: [mk("Parapulpal pin", 0)] },
  ]},
  { id: "implant", n: 6, label: "Implant", icon: "anchor", groups: [
    { id: uid(), title: "Implant", items: [
      mk("Implant - Nobel Biocare", 1500), mk("Implant - Neodent", 1000),
      mk("Implant - Straumann", 0), mk("Implant - Astra", 0),
      mk("Implant - Megagen", 0), mk("Implant - Nobel Alpha Bio", 0),
    ]},
    { id: uid(), title: "Implant abutment", items: [
      mk("Implant abutment - Titanium", 300), mk("Implant abutment - Zirconium", 500),
    ]},
    { id: uid(), title: "Implant (one-phase)", items: [mk("Implant - BCS/KOS", 1000)] },
    { id: uid(), title: "Other treatments", items: [
      mk("Healing screw", 0), mk("Gingiva former", 0), mk("Bar", 0),
      mk("Prosthetic screw (lateral)", 0), mk("Prosthetic screw", 0),
    ]},
  ]},
  { id: "crown", n: 7, label: "Crown", icon: "crown", groups: [
    { id: uid(), title: "Crown", items: [
      mk("Crown - Metal-ceramic", 400), mk("Crown - Zirconium", 700),
      mk("Crown - Emax", 0), mk("Crown - Gold-ceramic", 0),
    ]},
    { id: uid(), title: "Veneer", items: [mk("Veneer", 500)] },
    { id: uid(), title: "Other treatments", items: [mk("Telescopic crown", 0), mk("Filing", 0)]},
  ]},
  { id: "bridge", n: 8, label: "Bridge", icon: "wrench", groups: [
    { id: uid(), title: "Bridge", items: [
      mk("Bridge - Metal-ceramic", 400), mk("Bridge - Zirconium", 700),
      mk("Bridge - Press Ceramic", 0), mk("Bridge - Emax", 0),
    ]},
  ]},
  { id: "general", n: 9, label: "General (fixed price)", icon: "package", groups: [
    { id: uid(), title: "Packages", priceLabel: "Package price", items: [
      mk("All on 6 Bredent German", 0, "All Inclusive (6 pcs Bredent Implant - Temporary)"),
      mk("All on 6 Straumann Swiss", 0, "All Inclusive (6 pcs Straumann Implant - Temporary)"),
      mk("All on 4 Nobel Swiss", 0, "All Inclusive (4 pcs Nobel Implant - Temporary)"),
      mk("Premium Hollywood Smile", 0, "All Inclusive (All Transfers - 5 Stars Radisson)"),
      mk("Standard Smile Design", 0, "All Inclusive (All Transfers - 5 Stars Radisson)"),
    ]},
    { id: uid(), title: "General (fixed price)", priceLabel: "Package price", items: [
      mk("Panoramic X-ray", 50), mk("Impression", 0), mk("Sinus lift", 1000),
      mk("IV sedation", 1200), mk("Medical Pack", 200),
    ]},
    { id: uid(), title: "Diagnostics", priceLabel: "Package price", items: [] },
    { id: uid(), title: "Orthodontics (fixed price)", priceLabel: "Package price", items: [
      mk("Clear Aligners", 0), mk("Fixed ceramic braces", 0), mk("Fixed metal braces", 0),
      mk("Functional appliance", 0), mk("Removable appliance", 0), mk("Lingual braces", 0),
      mk("Orthodontic retainer", 0),
    ]},
    { id: uid(), title: "Dental Hygiene (fixed price)", priceLabel: "Package price", items: [
      mk("Teeth whitening - external bleach", 500),
      mk("Teeth whitening - internal bleach", 400),
      mk("Dental Hygiene Treatment", 100),
      mk("Prevention & hygiene", 150),
      mk("Topical fluoride", 50),
    ]},
    { id: uid(), title: "Hotel / Transfer", priceLabel: "Package price", items: [] },
  ]},
  { id: "other", n: 10, label: "Other", icon: "more", groups: [
    { id: uid(), title: "Other", items: [
      mk("Local X-ray", 0), mk("Accommodation", 0), mk("Transportation (Airport-Hotel-Clinic)", 0),
      mk("Apicoectomy", 0), mk("Core build-up", 0), mk("Crown lengthening", 0),
      mk("Gingival graft", 0), mk("Gingivectomy", 0), mk("Laser gingivectomy", 0),
      mk("Pocket reduction", 0), mk("Scaling / root planing", 0),
    ]},
  ]},
  { id: "hair", n: null, label: "Hair Transplant", icon: "sparkles", groups: [
    { id: uid(), title: "Packages & additional treatments", items: [] },
  ]},
];

function load(): PriceSection[] {
  if (typeof window === "undefined") return INITIAL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL));
      return INITIAL;
    }
    return JSON.parse(raw) as PriceSection[];
  } catch {
    return INITIAL;
  }
}

let state: PriceSection[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePricelist() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Normalize names so "Filling" matches "filling " and similar minor diffs. */
function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export const pricelistStore = {
  get(): PriceSection[] {
    return state;
  },
  setSections(next: PriceSection[]) {
    state = next;
    persist();
  },
  /** Look up a default price by treatment name. Returns 0 if not found. */
  getPriceFor(name: string): number {
    if (!name) return 0;
    const target = norm(name);
    for (const s of state) {
      for (const g of s.groups) {
        for (const it of g.items) {
          if (norm(it.name) === target) return it.price || 0;
        }
      }
    }
    // Fallback: substring match (handles e.g. "Bridge 24–26" → "Bridge")
    for (const s of state) {
      for (const g of s.groups) {
        for (const it of g.items) {
          if (it.price > 0 && target.startsWith(norm(it.name))) return it.price;
        }
      }
    }
    return 0;
  },
  newId: uid,
  newItem: mk,
};

export { uid as priceUid, mk as makePriceItem };
