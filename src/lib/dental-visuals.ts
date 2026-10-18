import type { ToothStatus } from "./patients-store";

// Coordinates use the same 40 × 80 anatomy as the tooth illustrations.
export const DENTAL_MARKS = {
  intact: "M14 23 L18 27 L27 17",
  missing: "M12 14 L28 30 M28 14 L12 30",
  caries: "M16 16 L23 14 L27 20 L24 27 L17 28 L13 22 Z M18 20 L23 24",
  discolored: "M13 17 Q20 9 27 17 L27 31 L13 31 Z M14 20 L26 27",
  worn: "M10 22 H30 M12 26 H28",
  fractured: "M19 13 L16 20 L23 24 L18 32",
  fracturedRoot: "M10 51 L17 55 L23 50 L30 54",
  radix: "M11 36 L16 31 L21 36 L27 32 L30 37",
  resorption: "M12 59 Q15 52 19 59 Q23 66 28 59 M14 64 H26",
  mobility: "M2 25 H12 M2 25 L6 21 M2 25 L6 29 M38 25 H28 M38 25 L34 21 M38 25 L34 29",
  necrosis: "M17 17 L23 28 M23 17 L17 28 M20 30 V62",
  composite: "M15 17 Q20 13 25 17 L25 26 Q20 30 15 26 Z",
  amalgam: "M14 16 H26 V28 H14 Z M15 17 L25 27 M25 17 L15 27",
  inlay: "M20 14 L27 21 L20 29 L13 21 Z",
  onlay: "M11 16 L16 12 L20 17 L24 12 L29 16 V25 H11 Z",
  root: "M20 19 V42 M20 42 Q13 48 15 69 M20 42 Q27 48 25 69",
  rootOne: "M20 18 V70",
  rootTwo: "M20 18 V40 M20 40 Q13 50 15 70 M20 40 Q27 50 25 70",
  rootThree: "M20 18 V70 M20 40 Q11 48 13 69 M20 40 Q29 48 27 69",
  retreatment: "M20 20 V68 M10 30 A12 12 0 1 1 30 32 M30 24 V32 H22",
  post: "M18 19 H22 V63 H18 Z M14 19 H26",
  pin: "M24 18 H27 V43 H24 Z",
  implant: "M15 38 H25 L23 72 H17 Z M14 44 H26 M14 51 H26 M15 58 H25 M16 65 H24",
  abutment: "M15 24 H25 L27 37 H13 Z M17 20 H23 V24",
  crown: "M11 31 V15 L17 20 L20 12 L23 20 L29 15 V31 Z",
  veneer: "M26 10 Q34 22 29 36 M23 12 Q29 22 26 34",
  bridge: "M2 29 H38 M4 24 V34 M36 24 V34",
  dentures: "M3 35 Q20 44 37 35 L37 43 Q20 53 3 43 Z M9 39 V44 M16 41 V47 M24 41 V47 M31 39 V44",
  malocclusion: "M7 15 H17 V23 H7 Z M23 22 H33 V30 H23 Z M7 33 H33",
  bruxism: "M11 18 H29 M11 24 H29 M16 8 L20 14 L24 8 M16 34 L20 28 L24 34",
  facial: "M20 9 V34 M16 11 Q5 20 15 32 M24 14 Q34 22 24 30",
  plaque: "M10 32 L14 29 L18 33 L22 30 L26 33 L30 30",
  gingivitis: "M5 37 Q12 31 20 37 Q28 31 35 37 M8 41 Q20 36 32 41",
  periodontitis: "M5 38 Q11 48 16 39 Q20 52 24 39 Q29 48 35 38",
  boneLoss: "M4 52 H12 M28 52 H36 M4 58 H12 M28 58 H36 M7 42 V49 M33 42 V49",
  overgrowth: "M5 36 Q10 20 16 33 Q20 21 24 33 Q30 20 35 36",
  recession: "M5 45 Q12 53 20 43 Q28 53 35 45 M20 38 V47",
  gummy: "M4 29 Q20 18 36 29 M4 33 Q20 24 36 33",
  tmj: "M8 15 A6 6 0 1 0 8 27 M9 22 L16 35 L30 35 M5 20 H12",
  muscle: "M7 17 Q20 7 33 17 L30 29 Q20 39 10 29 Z M12 20 L28 26 M12 25 L28 20",
  sinus: "M5 61 Q20 43 35 61 Q33 75 20 69 Q7 75 5 61 Z",
  forward: "M6 20 H33 L27 14 M33 20 L27 26",
  backward: "M34 20 H7 L13 14 M7 20 L13 26",
  apical: "M20 61 L29 69 L20 77 L11 69 Z",
  cyst: "M10 69 A10 8 0 1 0 30 69 A10 8 0 1 0 10 69 M14 69 A6 4 0 1 0 26 69",
  granuloma: "M20 61 Q24 57 26 63 Q33 63 29 69 Q33 75 25 75 Q20 81 16 75 Q8 76 11 69 Q7 62 15 63 Z",
  impacted: "M5 14 H35 M10 9 V19 M30 9 V19 M15 24 L26 35 M26 27 V35 H18",
  extraction: "M10 15 L30 35 M30 15 L10 35 M20 12 V3 M15 8 L20 3 L25 8",
  surgical: "M10 15 L30 35 M30 15 L10 35 M3 48 H15 M9 42 V54",
  implantRemoval: "M15 42 H25 L23 68 H17 Z M12 48 H28 M12 55 H28 M12 17 L28 33 M28 17 L12 33",
  crownRemoval: "M11 28 V17 L20 10 L29 17 V28 M13 14 L27 28 M27 14 L13 28",
  bridgeRemoval: "M2 29 H38 M4 24 V34 M36 24 V34 M13 16 L27 30 M27 16 L13 30",
  temporary: "M14 15 H26 V29 H14 Z M17 19 H23 M20 19 V26",
  medicated: "M13 15 H27 V29 H13 Z M16 22 H24 M20 18 V26",
  screw: "M18 26 H22 V64 H18 Z M14 30 H26 M14 38 H26 M14 46 H26 M14 54 H26",
  bar: "M3 28 H37 V34 H3 Z M9 24 V39 M31 24 V39",
  aligner: "M9 12 Q20 6 31 12 V35 Q20 41 9 35 Z M12 31 Q20 35 28 31",
  braces: "M3 24 H37 M15 19 H25 V29 H15 Z",
  whitening: "M20 12 L23 20 L31 23 L23 26 L20 34 L17 26 L9 23 L17 20 Z",
  hygiene: "M8 18 L30 31 M8 18 L12 11 M13 21 L17 14 M18 24 L22 17 M23 27 L27 20",
  fluoride: "M20 12 Q7 27 13 31 Q20 39 27 31 Q33 27 20 12 Z M16 26 H24 M20 22 V30",
  xray: "M7 11 H33 V35 H7 Z M12 16 L28 30 M28 16 L12 30",
  impression: "M7 15 V28 Q20 39 33 28 V15 M12 16 V26 Q20 32 28 26 V16",
  sedation: "M11 16 H23 L11 26 H23 M25 9 H32 L25 15 H32",
  medical: "M7 15 H33 V33 H7 Z M16 15 V10 H24 V15 M16 24 H24 M20 20 V28",
  apicoectomy: "M12 65 H28 M16 68 L24 76 M24 68 L16 76",
  core: "M12 31 L15 21 H25 L28 31 Z M18 31 V50 H22 V31",
  lengthening: "M6 42 Q20 49 34 42 M10 36 H30 M20 31 V42 M16 38 L20 42 L24 38",
  graft: "M5 38 Q20 49 35 38 L32 48 Q20 56 8 48 Z M14 46 H26 M20 41 V51",
  gingivectomy: "M5 38 Q20 47 35 38 M9 33 L31 45 M31 33 L9 45",
  laser: "M4 20 L23 39 M19 32 L23 39 L16 37 M25 43 L31 49 M28 39 H35",
  pocket: "M6 38 Q12 50 17 39 M23 39 Q28 50 34 38 M12 47 V39 M28 47 V39",
  scaling: "M6 20 L14 40 Q20 48 27 38 M9 46 H14 M27 46 H32",
  accommodation: "M7 31 V16 M7 24 H33 V31 M12 18 H20 V24 M20 20 H31 V24",
  transport: "M6 22 L11 14 H29 L34 22 V30 H6 Z M11 30 V33 M29 30 V33 M10 25 H14 M26 25 H30",
  general: "M10 13 H30 V33 H10 Z M14 19 H26 M14 24 H26 M14 29 H22",
  other: "M20 12 L31 23 L20 34 L9 23 Z M20 18 V25 M20 29 V30",
} as const;

export type DentalMark = keyof typeof DENTAL_MARKS;
export interface DentalVisual {
  key: string;
  label: string;
  mark: DentalMark;
  color: string;
  background: string;
  border: string;
  shortLabel: string;
  treatment: boolean;
}

export const DIAGNOSIS_MARKS: Record<string, DentalMark> = {
  Intact: "intact",
  Missing: "missing",
  Caries: "caries",
  Discolored: "discolored",
  Worn: "worn",
  Fractured: "fractured",
  "Fractured root": "fracturedRoot",
  Radix: "radix",
  "Root resorption": "resorption",
  Mobility: "mobility",
  Necrosis: "necrosis",
  "Filled (composite)": "composite",
  "Filled (amalgam)": "amalgam",
  Inlay: "inlay",
  "Root treated": "root",
  Post: "post",
  "Parapulpal pin": "pin",
  "Implant + abutment": "abutment",
  Implant: "implant",
  Crown: "crown",
  Veneer: "veneer",
  Bridge: "bridge",
  Dentures: "dentures",
  General: "general",
  Malocclusion: "malocclusion",
  "Bruxism signs": "bruxism",
  "Facial disproportions": "facial",
  Plaque: "plaque",
  Gingivitis: "gingivitis",
  Periodontitis: "periodontitis",
  "Bone loss": "boneLoss",
  "Gingival overgrowth": "overgrowth",
  "Gingival recession": "recession",
  "Gummy smile": "gummy",
  "TMJ disorder": "tmj",
  "Muscle disorder": "muscle",
  "Large maxillary sinus": "sinus",
  "Other...": "other",
  "Drifted (front)": "forward",
  "Drifted (back)": "backward",
  "Apical lesion": "apical",
  Cyst: "cyst",
  Granuloma: "granuloma",
  Impacted: "impacted",
};

const STATUS_LABELS: Record<ToothStatus, string> = {
  intact: "Intact",
  missing: "Missing",
  caries: "Caries",
  filled: "Filled (amalgam)",
  crown: "Crown",
  "root-treated": "Root treated",
  implant: "Implant",
  bridge: "Bridge",
};

export function normalizeDentalName(name: string) {
  return name.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
}

// Specific procedures precede broad categories: a crown removal is not a crown,
// and a post or veneer must not inherit a root canal or full crown illustration.
const TREATMENT_RULES: [RegExp, DentalMark][] = [
  [/remove.*implant|implant.*remov/, "implantRemoval"],
  [/bridge.*remov/, "bridgeRemoval"],
  [/crown.*remov/, "crownRemoval"],
  [/surgical.*extract/, "surgical"],
  [/extract|خلع/, "extraction"],
  [/lengthening/, "lengthening"],
  [/temporary.*fill/, "temporary"],
  [/medicated.*fill/, "medicated"],
  [/inlay/, "inlay"],
  [/onlay/, "onlay"],
  [/parapulpal|\bpin\b/, "pin"],
  [/\bpost\b/, "post"],
  [/re-?treatment/, "retreatment"],
  [/1 root/, "rootOne"],
  [/2 roots/, "rootTwo"],
  [/3 roots/, "rootThree"],
  [/root canal|\brct\b|عصب/, "root"],
  // The restoration name describes what is added; mentioning its implant,
  // abutment or screw support must not create a fixture at every bridge unit.
  [/veneer|فينير/, "veneer"],
  [/bridge|جسر/, "bridge"],
  [/crown|تاج/, "crown"],
  [/denture|pred-vertix|all on/, "dentures"],
  [/abutment/, "abutment"],
  [/screw/, "screw"],
  [/gingiva former/, "overgrowth"],
  [/^bar$/, "bar"],
  [/implant|زرع|زراع/, "implant"],
  [/fill|حشو/, "composite"],
  [/aligner|retainer|appliance/, "aligner"],
  [/braces|تقويم/, "braces"],
  [/whitening|bleach|smile|تبييض/, "whitening"],
  [/fluoride/, "fluoride"],
  [/hygiene|تنظيف/, "hygiene"],
  [/x-ray|xray|أشعة/, "xray"],
  [/impression/, "impression"],
  [/sinus/, "sinus"],
  [/sedation/, "sedation"],
  [/medical/, "medical"],
  [/apicoectomy/, "apicoectomy"],
  [/core build/, "core"],
  [/graft/, "graft"],
  [/laser/, "laser"],
  [/gingivectomy/, "gingivectomy"],
  [/pocket/, "pocket"],
  [/scaling|planing/, "scaling"],
  [/accommodation/, "accommodation"],
  [/transport/, "transport"],
];
const SECTION_MARKS: Record<string, DentalMark> = {
  extraction: "extraction",
  filling: "composite",
  "root-canal-treatment": "root",
  implant: "implant",
  crown: "crown",
  bridge: "bridge",
  veneer: "veneer",
  dentures: "dentures",
  "prosthesis-removal": "crownRemoval",
};

function hash(value: string) {
  return [...value].reduce(
    (sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
}

export function getDentalVisual(
  name: string,
  options: { status?: ToothStatus; treatment?: boolean; section?: string } = {},
): DentalVisual {
  const label = name.trim() || STATUS_LABELS[options.status ?? "intact"];
  const normalized = normalizeDentalName(label);
  const diagnosis = Object.entries(DIAGNOSIS_MARKS).find(
    ([key]) => normalizeDentalName(key) === normalized,
  );
  const mark = options.treatment
    ? (TREATMENT_RULES.find(([rule]) => rule.test(normalized))?.[1] ??
      SECTION_MARKS[options.section ?? ""] ??
      "other")
    : (diagnosis?.[1] ?? DIAGNOSIS_MARKS[STATUS_LABELS[options.status ?? "intact"]]);
  const key = `${options.treatment ? "treatment" : "diagnosis"}:${normalized}`;
  const seed = hash(key);
  const hue = seed % 360;
  const saturation = 52 + ((seed >>> 9) % 24);
  const lightness = 32 + ((seed >>> 17) % 12);
  return {
    key,
    label,
    mark,
    treatment: !!options.treatment,
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    background: `hsl(${hue}, ${saturation}%, 94%)`,
    border: `hsl(${hue}, ${saturation}%, 72%)`,
    shortLabel: label
      .replace(/[()]/g, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 5)
      .toUpperCase(),
  };
}
