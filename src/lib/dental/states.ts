// Dental state ids shared by the diagnosis engine, the treatment engine and the
// odontogram. The numbering follows the reference planner, so imported plans
// and price lists keep their meaning.
export const STATE = {
  intact: 1,
  missing: 2,
  caries: 3,
  filledAmalgam: 4,
  filledComposite: 5,
  postWhite: 6,
  post: 7,
  postPreparation: 8,
  crown: 9,
  implantOnePhase: 10,
  implant: 11,
  healingScrew: 12,
  abutment: 13,
  impression: 14,
  bridge: 15,
  worn: 16,
  inlayPreparation: 17,
  inlay: 18,
  filed: 19,
  goldCrown: 21,
  goldFilling: 22,
  onlayPreparation: 23,
  onlay: 24,
  veneerPreparation: 25,
  veneer: 26,
  filling: 27,
  fractured: 28,
  radix: 29,
  discolored: 30,
  impacted: 31,
  extraction: 33,
  parapulpalPin: 34,
  healingTime: 98,
  visit: 99,
  discount: 100,
  prosthesisRemoval: 200,
  rootCanal: 201,
  rootCanalAlt: 204,
  customTreatment: 207,
  customStatus: 208,
  dentures: 300,
  preciVertix: 302,
  overdentures: 303,
  prostheticScrew: 304,
  telescopicCrown: 305,
  partialDentures: 306,
  denturesFixed: 308,
  denturesPartialPlate: 309,
  abutmentBioHpp: 311,
  implantTilted: 312,
  prostheticScrewLateral: 313,
  temporaryProsthesis: 315,
  implantMini: 318,
  abutmentBar: 320,
  implantAlt: 322,
  general: 400,
  malocclusion: 401,
  bruxism: 402,
  deepBite: 403,
  facialDisproportions: 404,
  gingivitis: 405,
  gingivalOvergrowth: 406,
  gingivalRecession: 407,
  gummySmile: 408,
  periodontitis: 409,
  tmjDisorder: 410,
  muscleDisorder: 411,
  apicalLesion: 412,
  boneLoss: 413,
  plaque: 414,
  fracturedRoot: 415,
  largeSinus: 416,
  mobility: 417,
  necrosis: 418,
  rootResorption: 419,
  driftedFront: 420,
  driftedBack: 421,
  gingivaFormer: 924,
} as const;

export type StateId = number;

interface StateLabel {
  status?: string;
  treatment?: string;
  short: string;
}

// English labels for every state: the chip title (status), the treatment row
// title and the short form used for undo/redo hints.
export const STATE_LABELS: Record<number, StateLabel> = {
  1: { status: "Intact", short: "intact" },
  2: { status: "Missing", short: "missing" },
  3: { status: "Caries", short: "caries" },
  4: { status: "Filled (amalgam)", short: "filled (am.)" },
  5: { status: "Filled (composite)", short: "filled (comp.)" },
  6: { treatment: "Post preparation", short: "post" },
  7: { status: "Post", treatment: "Post (metal)", short: "post" },
  8: { treatment: "Post", short: "post preparation" },
  9: { status: "Crown", treatment: "Crown", short: "crown" },
  10: { treatment: "Implant (one-phase)", short: "implant - one-phase" },
  11: { status: "Implant", treatment: "Implant", short: "implant" },
  12: { treatment: "Healing screw", short: "healing screw" },
  13: { status: "Abutment", treatment: "Abutment", short: "abutment" },
  14: { treatment: "Impression", short: "impression" },
  15: { status: "Bridge", treatment: "Bridge", short: "bridge" },
  16: { status: "Worn", short: "worn" },
  17: { short: "inlay preparation" },
  18: { status: "Inlay", treatment: "Inlay", short: "inlay" },
  19: { status: "Filed", treatment: "Filing", short: "filing" },
  23: { short: "onlay preparation" },
  24: { treatment: "Onlay", short: "onlay" },
  25: { treatment: "Veneer removal", short: "veneer preparation" },
  26: { status: "Veneer", treatment: "Veneer", short: "veneer" },
  27: { treatment: "Filling", short: "filling" },
  28: { status: "Fractured", short: "fractured" },
  29: { status: "Radix", short: "radix" },
  30: { status: "Discolored", short: "discolored" },
  31: { status: "Impacted", short: "impacted" },
  33: { treatment: "Extraction", short: "extraction" },
  34: { status: "Parapulpal pin", treatment: "Parapulpal pin", short: "parapulpal pin" },
  98: { short: "healing time" },
  99: { short: "visit" },
  100: { short: "discount" },
  200: { treatment: "Prosthesis removal", short: "prosthesis removal" },
  201: { status: "Root treated", treatment: "Root canal treatment", short: "RCT" },
  207: { short: "other treatment" },
  208: { status: "Other...", short: "other status" },
  300: { status: "Dentures", treatment: "Dentures", short: "dentures" },
  302: { treatment: "Preci-vertix", short: "preci-vertix" },
  303: { treatment: "Overdentures", short: "overdentures" },
  304: { treatment: "Prosthetic screw", short: "prosthetic screw" },
  305: { treatment: "Telescopic crown", short: "telescopic crown" },
  306: {
    status: "Dentures",
    treatment: "Partial plate removable denture",
    short: "partial dentures",
  },
  308: { treatment: "Dentures", short: "dentures" },
  312: { treatment: "Implant (tilted)", short: "implant" },
  313: { treatment: "Prosthetic screw (side)", short: "prosthetic screw" },
  315: { treatment: "Temporary denture", short: "temporary bridge" },
  318: { treatment: "Implant (mini)", short: "implant" },
  320: { treatment: "Reinforcing bar (pier)", short: "bar" },
  322: { status: "Implant", treatment: "Implant", short: "implant" },
  400: { status: "General", short: "general" },
  401: { status: "Malocclusion", short: "malocclusion" },
  402: { status: "Bruxism signs", short: "bruxism signs" },
  403: { status: "Deep bite", short: "deep bite" },
  404: { status: "Facial disproportions", short: "facial disprop." },
  405: { status: "Gingivitis", short: "gingivitis" },
  406: { status: "Gingival overgrowth", short: "ging. overgrowth" },
  407: { status: "Gingival recession", short: "ging. recession" },
  408: { status: "Gummy smile", short: "gummy smile" },
  409: { status: "Periodontitis", short: "periodontitis" },
  410: { status: "TMJ disorder", short: "TMJ disorder" },
  411: { status: "Muscle disorder", short: "muscle disorder" },
  412: { status: "Apical lesion", short: "apical lesion" },
  413: { status: "Bone loss", short: "bone loss" },
  414: { status: "Plaque", short: "plaque" },
  415: { status: "Fractured root", short: "fractured root" },
  416: { status: "Large maxillary sinus", short: "large maxillary sinus" },
  417: { status: "Mobility", short: "mobility" },
  418: { status: "Necrosis", short: "necrosis" },
  419: { status: "Root resorption", short: "root resorption" },
  420: { status: "Drifted (front)", short: "drifted" },
  421: { status: "Drifted (back)", short: "drifted" },
  924: { treatment: "Gingiva former", short: "gingiva former" },
};

export function statusLabel(stateId: number): string {
  const label = STATE_LABELS[stateId];
  return label?.status ?? label?.treatment ?? String(stateId);
}

export function shortLabel(stateId: number): string {
  return STATE_LABELS[stateId]?.short ?? String(stateId);
}

// Whole-mouth findings: applied without a tooth they land on tooth 0 (the
// GENERAL row), with teeth selected they attach to those teeth.
export const GENERAL_STATE_IDS: readonly number[] = [
  208, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
  418, 419,
];

export interface DiagnosisButtonItem {
  /** One click can apply two states at once, e.g. implant + abutment. */
  stateIds: number[];
  label: string;
  /** Opens the free-text dialog instead of applying straight away. */
  custom?: boolean;
}

export interface DiagnosisButton {
  label: string;
  items: DiagnosisButtonItem[];
}

const item = (label: string, ...stateIds: number[]): DiagnosisButtonItem => ({ label, stateIds });

// The ten diagnosis buttons, in the order they appear next to the chart. The
// button face applies its first item; the rest sit in its dropdown.
export const DIAGNOSIS_BUTTONS: DiagnosisButton[] = [
  { label: "Missing", items: [item("Missing", 2)] },
  {
    label: "Intact",
    items: [
      item("Intact", 1),
      item("Discolored", 30),
      item("Worn", 16),
      item("Fractured", 28),
      item("Fractured root", 415),
      item("Radix", 29),
      item("Root resorption", 419),
      item("Mobility", 417),
      item("Necrosis", 418),
    ],
  },
  {
    label: "Filled (amalgam)",
    items: [item("Filled (amalgam)", 4), item("Filled (composite)", 5), item("Inlay", 18)],
  },
  { label: "Caries", items: [item("Caries", 3)] },
  {
    label: "Root treated",
    items: [item("Root treated", 201), item("Post", 7), item("Parapulpal pin", 34)],
  },
  {
    label: "Implant + abutment",
    items: [item("Implant + abutment", 11, 13), item("Implant", 11, 12)],
  },
  { label: "Crown", items: [item("Crown", 9), item("Veneer", 26)] },
  { label: "Bridge", items: [item("Bridge", 15), item("Dentures", 300)] },
  {
    label: "General",
    items: [
      { label: "General", stateIds: [400], custom: true },
      item("Malocclusion", 401),
      item("Bruxism signs", 402),
      item("Facial disproportions", 404),
      item("Plaque", 414),
      item("Gingivitis", 405),
      item("Periodontitis", 409),
      item("Bone loss", 413),
      item("Gingival overgrowth", 406),
      item("Gingival recession", 407),
      item("Gummy smile", 408),
      item("TMJ disorder", 410),
      item("Muscle disorder", 411),
      item("Large maxillary sinus", 416),
    ],
  },
  {
    label: "Other...",
    items: [
      { label: "Other...", stateIds: [208], custom: true },
      item("Drifted (front)", 420),
      item("Drifted (back)", 421),
      item("Apical lesion", 412),
      item("Cyst", 208),
      item("Granuloma", 208),
      item("Impacted", 31),
    ],
  },
];

export interface ExtraDiagnosisOptions {
  multiple: boolean;
  /** "-" is a divider between the surfaces and the conditions. */
  options: string[];
}

const SURFACES = ["M", "O", "D", "L", "B"];
const RESTORATION_PROBLEMS = [
  "SecunderCaries",
  "Leaking",
  "Worn",
  "Fractured",
  "Discolored",
  "Unaesthetic",
];
const PROSTHESIS_PROBLEMS = [
  "Decayed",
  "Leaking",
  "Worn",
  "Fractured",
  "Discolored",
  "Unaesthetic",
  "Loose",
  "Sensitive",
  "Misaligned",
];
const SEVERITY = ["Mild", "Moderate", "Severe"];

// The details panel that opens right after a state is applied, keyed by state id.
export const EXTRA_DIAGNOSIS: Record<number, ExtraDiagnosisOptions> = {
  3: { multiple: true, options: SURFACES },
  4: { multiple: true, options: [...SURFACES, "-", ...RESTORATION_PROBLEMS] },
  5: { multiple: true, options: [...SURFACES, "-", ...RESTORATION_PROBLEMS] },
  18: { multiple: true, options: RESTORATION_PROBLEMS },
  9: { multiple: true, options: PROSTHESIS_PROBLEMS },
  15: { multiple: true, options: PROSTHESIS_PROBLEMS },
  26: { multiple: true, options: PROSTHESIS_PROBLEMS },
  11: { multiple: true, options: ["Malpositioned", "BoneLoss", "GingivalRecession"] },
  16: { multiple: false, options: SEVERITY },
  28: { multiple: false, options: SEVERITY },
  201: { multiple: true, options: ["Unsatisfactory", "Incomplete"] },
  401: {
    multiple: true,
    options: [
      "Class2",
      "Class3",
      "MidlineShift",
      "Crowding",
      "Spacing",
      "Overjet",
      "Underbite",
      "Deepbite",
      "Openbite",
      "PosteriorCrossbite",
      "SkeletalDisharmony",
    ],
  },
  402: { multiple: false, options: SEVERITY },
  404: {
    multiple: true,
    options: ["Retrognathic", "Prognathic", "ShortLowerFace", "LongLowerFace"],
  },
  405: { multiple: false, options: SEVERITY },
  407: { multiple: false, options: SEVERITY },
  409: { multiple: false, options: SEVERITY },
};

export const EXTRA_DIAGNOSIS_LABELS: Record<string, string> = {
  M: "M",
  O: "O",
  D: "D",
  L: "L",
  B: "B",
  SecunderCaries: "Secunder caries",
  Leaking: "Leaking",
  Worn: "Worn",
  Fractured: "Fractured",
  Discolored: "Discolored",
  Unaesthetic: "Unaesthetic",
  Decayed: "Decayed",
  Loose: "Loose",
  Sensitive: "Sensitive",
  Misaligned: "Misaligned",
  Malpositioned: "Malpositioned",
  BoneLoss: "Bone loss",
  GingivalRecession: "Gingival recession",
  Mild: "Mild",
  Moderate: "Moderate",
  Severe: "Severe",
  Unsatisfactory: "Unsatisfactory",
  Incomplete: "Incomplete",
  Class2: "Class II",
  Class3: "Class III",
  MidlineShift: "Midline shift",
  Crowding: "Crowding",
  Spacing: "Spacing",
  Overjet: "Overjet",
  Underbite: "Underbite",
  Deepbite: "Deep bite",
  Openbite: "Open bite",
  PosteriorCrossbite: "Posterior crossbite",
  SkeletalDisharmony: "Skeletal disharmony",
  Retrognathic: "Retrognathic",
  Prognathic: "Prognathic",
  ShortLowerFace: "Short lower face",
  LongLowerFace: "Long lower face",
};

/** " - M, O, Leaking": the suffix appended to a chip title after its options. */
export function extraDiagnosisSuffix(stateId: number, selected: string[]): string {
  const options = EXTRA_DIAGNOSIS[stateId]?.options ?? [];
  const picked = options.filter((option) => option !== "-" && selected.includes(option));
  return picked.length
    ? ` - ${picked.map((key) => EXTRA_DIAGNOSIS_LABELS[key] ?? key).join(", ")}`
    : "";
}
