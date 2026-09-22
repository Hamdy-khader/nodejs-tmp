import type { PricelistData } from "@/lib/admin/api";

type CatalogItemTemplate = {
  key: string;
  name: string;
  price: number;
};

type CatalogGroupTemplate = {
  key: string;
  title: string;
  items: CatalogItemTemplate[];
};

type CatalogSectionTemplate = {
  key: string;
  n: number;
  label: string;
  icon: string;
  aliases: string[];
  groups: CatalogGroupTemplate[];
};

const OTHER_TREATMENTS = "Other treatments";

const TREATMENT_CATALOG: CatalogSectionTemplate[] = [
  {
    key: "extraction",
    n: 1,
    label: "Extraction",
    icon: "scissors",
    aliases: ["extraction"],
    groups: [
      {
        key: "extraction",
        title: "Extraction",
        items: [
          { key: "wisdom-extraction", name: "Wisdom Extraction", price: 100 },
          { key: "surgical-extraction", name: "Surgical Extraction", price: 200 },
          { key: "remove-existing-implant", name: "Remove Existing Implant", price: 0 },
        ],
      },
      { key: "other", title: OTHER_TREATMENTS, items: [] },
    ],
  },
  {
    key: "prosthesis-removal",
    n: 2,
    label: "Prosthesis Removal",
    icon: "layers",
    aliases: ["prosthesis-removal", "prosthesis", "prosthesis removal"],
    groups: [
      {
        key: "prosthesis-removal",
        title: "Prosthesis Removal",
        items: [
          { key: "bridge-removal", name: "Bridge Removal", price: 10 },
          { key: "crown-removal", name: "Crown Removal", price: 10 },
        ],
      },
    ],
  },
  {
    key: "filling",
    n: 3,
    label: "Filling",
    icon: "droplet",
    aliases: ["filling"],
    groups: [
      {
        key: "filling",
        title: "Filling",
        items: [
          { key: "filling", name: "Filling", price: 150 },
          { key: "temporary-filling", name: "Temporary Filling", price: 0 },
          { key: "medicated-filling", name: "Medicated Filling", price: 0 },
          { key: "inlay", name: "Inlay", price: 300 },
          { key: "onlay", name: "Onlay", price: 300 },
        ],
      },
      { key: "other", title: OTHER_TREATMENTS, items: [] },
    ],
  },
  {
    key: "dentures",
    n: 4,
    label: "Dentures",
    icon: "smile",
    aliases: ["dentures", "denture"],
    groups: [
      {
        key: "dentures",
        title: "Dentures",
        items: [
          { key: "temporary-bridge", name: "Temporary Bridge", price: 20 },
          { key: "temporary-crown", name: "Temporary Crown", price: 20 },
          { key: "overdenture", name: "Overdenture", price: 0 },
          { key: "overdentures", name: "Overdentures", price: 0 },
          { key: "pred-vertix", name: "Pred-vertix", price: 0 },
        ],
      },
    ],
  },
  {
    key: "root-canal-treatment",
    n: 5,
    label: "Root Canal Treatment",
    icon: "activity",
    aliases: ["root-canal-treatment", "root canal treatment", "rct"],
    groups: [
      {
        key: "root-canal-treatment",
        title: "Root Canal Treatment",
        items: [
          { key: "rct-1-root", name: "Root Canal Treatment (1 Root)", price: 400 },
          { key: "rct-2-roots", name: "Root Canal Treatment (2 Roots)", price: 500 },
          { key: "rct-3-roots", name: "Root Canal Treatment (3 Roots)", price: 600 },
          { key: "rct-retreatment", name: "Root Canal Re-treatment", price: 500 },
          { key: "post-composite", name: "Post (Composite)", price: 200 },
          { key: "parapulpal-pin", name: "Parapulpal Pin", price: 0 },
        ],
      },
      { key: "other", title: OTHER_TREATMENTS, items: [] },
    ],
  },
  {
    key: "implant",
    n: 6,
    label: "Implant",
    icon: "anchor",
    aliases: ["implant"],
    groups: [
      {
        key: "implant",
        title: "Implant",
        items: [
          { key: "implant-nobel-biocare", name: "Implant - Nobel Biocare", price: 1500 },
          { key: "implant-neodent", name: "Implant - Neodent", price: 1000 },
          { key: "implant-straumann", name: "Implant - Straumann", price: 0 },
          { key: "implant-astra", name: "Implant - Astra", price: 0 },
          { key: "implant-megagen", name: "Implant - Megagen", price: 0 },
          { key: "implant-nobel-alpha-bio", name: "Implant - Nobel Alpha Bio", price: 0 },
        ],
      },
      {
        key: "implant-abutment",
        title: "Implant Abutment",
        items: [
          { key: "titanium-abutment", name: "Titanium Abutment", price: 300 },
          { key: "zirconium-abutment", name: "Zirconium Abutment", price: 500 },
        ],
      },
      {
        key: "one-phase-implant",
        title: "One-Phase Implant",
        items: [{ key: "bcs-kos-implant", name: "BCS/KOS Implant", price: 1000 }],
      },
      {
        key: "implant-accessories",
        title: "Implant Accessories",
        items: [
          { key: "healing-screw", name: "Healing Screw", price: 0 },
          { key: "gingiva-former", name: "Gingiva Former", price: 0 },
          { key: "bar", name: "Bar", price: 0 },
          { key: "prosthetic-screw-lateral", name: "Prosthetic Screw (Lateral)", price: 0 },
          { key: "prosthetic-screw", name: "Prosthetic Screw", price: 0 },
        ],
      },
    ],
  },
  {
    key: "crown",
    n: 7,
    label: "Crown",
    icon: "crown",
    aliases: ["crown"],
    groups: [
      {
        key: "crown",
        title: "Crown",
        items: [
          { key: "metal-ceramic-crown", name: "Metal-Ceramic Crown", price: 400 },
          { key: "zirconium-crown", name: "Zirconium Crown", price: 700 },
          { key: "emax-crown", name: "Emax Crown", price: 0 },
          { key: "gold-ceramic-crown", name: "Gold-Ceramic Crown", price: 0 },
        ],
      },
    ],
  },
  {
    key: "veneer",
    n: 8,
    label: "Veneer",
    icon: "sparkles",
    aliases: ["veneer"],
    groups: [
      {
        key: "veneer",
        title: "Veneer",
        items: [{ key: "veneer", name: "Veneer", price: 500 }],
      },
      {
        key: "other",
        title: OTHER_TREATMENTS,
        items: [
          { key: "telescopic-crown", name: "Telescopic crown", price: 0 },
          { key: "filling-other", name: "Filling", price: 0 },
        ],
      },
    ],
  },
  {
    key: "bridge",
    n: 9,
    label: "Bridge",
    icon: "wrench",
    aliases: ["bridge"],
    groups: [
      {
        key: "bridge",
        title: "Bridge",
        items: [
          { key: "metal-ceramic-bridge", name: "Metal-Ceramic Bridge", price: 400 },
          { key: "zirconium-bridge", name: "Zirconium Bridge", price: 700 },
          { key: "press-ceramic-bridge", name: "Press Ceramic Bridge", price: 0 },
          { key: "emax-bridge", name: "Emax Bridge", price: 0 },
        ],
      },
    ],
  },
  {
    key: "general",
    n: 10,
    label: "General",
    icon: "package",
    aliases: ["general"],
    groups: [
      {
        key: "packages",
        title: "Packages",
        items: [
          { key: "all-on-6-bredent-german", name: "All on 6 Bredent German", price: 0 },
          { key: "all-on-6-bredent-swiss", name: "All on 6 Bredent Swiss", price: 0 },
          { key: "all-on-4-bredent-swiss", name: "All on 4 Bredent Swiss", price: 0 },
          { key: "premium-hollywood-smile", name: "Premium Hollywood Smile", price: 0 },
          { key: "standard-smile-design", name: "Standard Smile Design", price: 0 },
        ],
      },
      {
        key: "general-fixed-price",
        title: "General (Fixed Price)",
        items: [
          { key: "panoramic-x-ray", name: "Panoramic X-Ray", price: 50 },
          { key: "impression", name: "Impression", price: 0 },
          { key: "sinus-lift", name: "Sinus Lift", price: 1000 },
          { key: "iv-sedation", name: "IV Sedation", price: 1200 },
          { key: "medical-pack", name: "Medical Pack", price: 200 },
        ],
      },
      {
        key: "orthodontics-fixed-price",
        title: "Orthodontics (Fixed Price)",
        items: [
          { key: "clear-aligners", name: "Clear Aligners", price: 0 },
          { key: "fixed-ceramic-braces", name: "Fixed Ceramic Braces", price: 0 },
          { key: "fixed-metal-braces", name: "Fixed Metal Braces", price: 0 },
          { key: "functional-appliance", name: "Functional Appliance", price: 0 },
          { key: "removable-appliance", name: "Removable Appliance", price: 0 },
          { key: "lingual-braces", name: "Lingual Braces", price: 0 },
          { key: "orthodontic-retainer", name: "Orthodontic Retainer", price: 0 },
        ],
      },
      {
        key: "dental-hygiene-fixed-price",
        title: "Dental Hygiene (Fixed Price)",
        items: [
          { key: "teeth-whitening-external-bleach", name: "Teeth Whitening (External Bleach)", price: 500 },
          { key: "teeth-whitening-internal-bleach", name: "Teeth Whitening (Internal Bleach)", price: 400 },
          { key: "dental-hygiene-treatment", name: "Dental Hygiene Treatment", price: 100 },
          { key: "prevention-hygiene", name: "Prevention & Hygiene", price: 150 },
          { key: "topical-fluoride", name: "Topical Fluoride", price: 50 },
        ],
      },
    ],
  },
  {
    key: "other",
    n: 11,
    label: "Other",
    icon: "more",
    aliases: ["other"],
    groups: [
      {
        key: "other",
        title: "Other",
        items: [
          { key: "local-x-ray", name: "Local X-Ray", price: 0 },
          { key: "accommodation", name: "Accommodation", price: 0 },
          { key: "transportation", name: "Transportation (Airport-Hotel-Clinic)", price: 0 },
          { key: "apicoectomy", name: "Apicoectomy", price: 0 },
          { key: "core-build-up", name: "Core Build-up", price: 0 },
          { key: "crown-lengthening", name: "Crown Lengthening", price: 0 },
          { key: "gingival-graft", name: "Gingival Graft", price: 0 },
          { key: "gingivectomy", name: "Gingivectomy", price: 0 },
          { key: "laser-gingivectomy", name: "Laser Gingivectomy", price: 0 },
          { key: "pocket-reduction", name: "Pocket Reduction", price: 0 },
          { key: "scaling-root-planing", name: "Scaling / Root Planing", price: 0 },
        ],
      },
    ],
  },
];

function norm(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Clinic records are authoritative. Defaults are seeded by the backend when a
// clinic is created; rebuilding them here loses custom treatments and prices.
export function normalizePricelistData(data: PricelistData): PricelistData {
  return {
    settings: { ...data.settings },
    sections: data.sections.map((section) => ({
      ...section,
      groups: section.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item, price: Number(item.price) })),
      })),
    })),
  };
}

export function getCatalogSectionById(sectionId: string) {
  return TREATMENT_CATALOG.find((section) => section.key === sectionId);
}

export function isDefaultItem(sectionId: string, groupTitle: string, itemName: string) {
  const group = getCatalogSectionById(sectionId)?.groups.find(
    (entry) => norm(entry.title) === norm(groupTitle),
  );
  if (!group) return false;
  return group.items.some((item) => norm(item.name) === norm(itemName));
}

export function getToothStatusForTreatment(
  sectionId: string,
  treatmentName: string,
): "missing" | "filled" | "root-treated" | "implant" | "crown" | "bridge" | null {
  const item = norm(treatmentName);

  if (sectionId === "extraction") return "missing";
  if (sectionId === "filling") return "filled";
  if (sectionId === "root-canal-treatment") return "root-treated";
  if (sectionId === "implant") return "implant";
  if (sectionId === "crown" || sectionId === "veneer") return "crown";
  if (sectionId === "bridge") return "bridge";

  if (sectionId === "dentures") {
    if (item.includes("temporary crown")) return "crown";
    if (item.includes("temporary bridge")) return "bridge";
    return null;
  }

  return null;
}

export function getTreatmentSections() {
  return TREATMENT_CATALOG.map((section) => ({
    id: section.key,
    label: section.label,
    icon: section.icon,
    number: section.n,
  }));
}
