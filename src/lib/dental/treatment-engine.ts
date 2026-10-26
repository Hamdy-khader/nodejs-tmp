import type { TreatmentItem, TreatmentRow } from "@/lib/patients-store";
import type { PriceItem, PriceSection, PriceSubGroup } from "@/lib/pricelist-store";
import { isTotalAdjustment } from "@/lib/treatment-pricing";
import type { PlannedState } from "./tooth-visual";
import { STATE } from "./states";

// Treatments as the reference planner adds them: one row per jaw for the
// selected teeth, smart buttons that pick the type, the root count or a
// package, and Autocorrect for the clinical order. Rows are stored the way the
// API keeps them: one item per tooth inside a visit, consecutive items of the
// same treatment and jaw forming one displayed row.

/** A price-list item resolved to the section and group it lives in. */
export interface CatalogEntry {
  sectionKey: string;
  groupKey: string;
  item: PriceItem;
}

/** Zero-price preparation steps the reference planner adds around prosthetics. */
export const PREPARATION_STEPS = {
  filing: { key: "step-filing", name: "Filing", stateId: STATE.filed, sectionKey: "crown" },
  postPreparation: {
    key: "step-post-preparation",
    name: "Post preparation",
    stateId: STATE.postPreparation,
    sectionKey: "root-canal-treatment",
  },
  inlayPreparation: {
    key: "step-inlay-preparation",
    name: "Inlay preparation",
    stateId: STATE.inlayPreparation,
    sectionKey: "filling",
  },
  onlayPreparation: {
    key: "step-onlay-preparation",
    name: "Onlay preparation",
    stateId: STATE.onlayPreparation,
    sectionKey: "filling",
  },
  veneerPreparation: {
    key: "step-veneer-preparation",
    name: "Veneer preparation",
    stateId: STATE.veneerPreparation,
    sectionKey: "veneer",
  },
} as const;

type StepKey = keyof typeof PREPARATION_STEPS;
const STEP_BY_ITEM_KEY = new Map<string, (typeof PREPARATION_STEPS)[StepKey]>(
  Object.values(PREPARATION_STEPS).map((step) => [step.key, step]),
);

/** The dental state a planned item draws and sorts as. */
export function treatmentState(
  item: Pick<TreatmentItem, "catalogSectionKey" | "catalogGroupKey" | "catalogItemKey">,
): number {
  const section = item.catalogSectionKey ?? "";
  const group = item.catalogGroupKey ?? "";
  const key = item.catalogItemKey ?? "";
  const step = STEP_BY_ITEM_KEY.get(key);
  if (step) return step.stateId;
  switch (section) {
    case "extraction":
      return STATE.extraction;
    case "prosthesis-removal":
      return STATE.prosthesisRemoval;
    case "filling":
      return key === "inlay" ? STATE.inlay : key === "onlay" ? STATE.onlay : STATE.filling;
    case "dentures":
      if (key === "temporary-bridge" || key === "temporary-crown") return STATE.temporaryProsthesis;
      if (key === "overdentures") return STATE.overdentures;
      if (key === "pred-vertix" || key === "preci-vertix") return STATE.preciVertix;
      return STATE.dentures;
    case "root-canal-treatment":
      if (key === "post-composite") return STATE.postWhite;
      if (key === "parapulpal-pin") return STATE.parapulpalPin;
      return STATE.rootCanal;
    case "implant":
      if (group === "implant-abutment") return STATE.abutment;
      if (group === "one-phase-implant") return STATE.implantOnePhase;
      if (key === "healing-screw") return STATE.healingScrew;
      if (key === "gingiva-former") return STATE.gingivaFormer;
      if (key === "bar") return STATE.abutmentBar;
      if (key === "prosthetic-screw-lateral") return STATE.prostheticScrewLateral;
      if (key === "prosthetic-screw") return STATE.prostheticScrew;
      return STATE.implant;
    case "crown":
      return key === "telescopic-crown" ? STATE.telescopicCrown : STATE.crown;
    case "veneer":
      if (key === "telescopic-crown") return STATE.telescopicCrown;
      if (key === "filling-other") return STATE.filling;
      return STATE.veneer;
    case "bridge":
      return STATE.bridge;
    case "general":
      return key === "impression" ? STATE.impression : STATE.customTreatment;
    default:
      return STATE.customTreatment;
  }
}

// Treatments that make sense without a tooth: whole-mouth work and extras.
const TOOTHLESS_STATES: number[] = [
  STATE.healingTime,
  STATE.visit,
  STATE.discount,
  202,
  STATE.customTreatment,
];

export const SELECT_TEETH_MESSAGE = "Select the teeth";

/** Groups whose items are types of one treatment: the row offers a type switch. */
export const TYPE_GROUPS: { sectionKey: string; groupKey: string; label: string }[] = [
  { sectionKey: "crown", groupKey: "crown", label: "Crown" },
  { sectionKey: "bridge", groupKey: "bridge", label: "Bridge" },
  { sectionKey: "implant", groupKey: "implant", label: "Implant" },
  { sectionKey: "implant", groupKey: "implant-abutment", label: "Abutment" },
  { sectionKey: "implant", groupKey: "one-phase-implant", label: "One-phase implant" },
];

export function isTypeGroup(sectionKey?: string, groupKey?: string) {
  return TYPE_GROUPS.some(
    (group) => group.sectionKey === sectionKey && group.groupKey === groupKey,
  );
}

/** Roots of each tooth, used to pick the root canal price. */
export function rootCount(tooth: number) {
  const position = tooth % 10;
  const upper = Math.floor(tooth / 10) === 1 || Math.floor(tooth / 10) === 2;
  if (upper) return position >= 6 ? 3 : position === 4 ? 2 : 1;
  return position >= 6 ? 2 : 1;
}

export function jawOf(tooth: number): "upper" | "lower" {
  const quadrant = Math.floor(tooth / 10);
  return quadrant === 1 || quadrant === 2 ? "upper" : "lower";
}

// ─── Buttons ────────────────────────────────────────────────────────────────

export type TreatmentEntry =
  | { kind: "item"; label: string; entry: CatalogEntry }
  /** Adds the first type of a group; the row can switch to the other types. */
  | { kind: "type"; label: string; sectionKey: string; groupKey: string }
  /** Root canal priced by each tooth's number of roots. */
  | { kind: "roots"; label: string }
  /** Implant with its abutment as two rows. */
  | { kind: "implant-abutment"; label: string }
  | { kind: "step"; label: string; step: StepKey }
  /** Free-text treatment typed by the user. */
  | { kind: "custom"; label: string; sectionKey: string };

export interface TreatmentButton {
  label: string;
  face: TreatmentEntry | undefined;
  entries: TreatmentEntry[];
}

function section(sections: PriceSection[], key: string) {
  return sections.find((candidate) => candidate.key === key);
}

function itemsOf(
  sections: PriceSection[],
  sectionKey: string,
  groupKey?: string,
): TreatmentEntry[] {
  const found = section(sections, sectionKey);
  if (!found) return [];
  return found.groups
    .filter((group) => !groupKey || group.key === groupKey)
    .flatMap((group: PriceSubGroup) =>
      group.items.map((item) => ({
        kind: "item" as const,
        label: item.name,
        entry: { sectionKey: sectionKey, groupKey: group.key, item },
      })),
    );
}

function exceptGroups(entries: TreatmentEntry[], groupKeys: string[]) {
  return entries.filter(
    (entry) => entry.kind !== "item" || !groupKeys.includes(entry.entry.groupKey),
  );
}

/**
 * The ten green buttons, laid out like the reference planner: the face applies
 * the first entry, the arrow lists every entry of that button.
 */
export function buildTreatmentButtons(sections: PriceSection[]): TreatmentButton[] {
  const make = (label: string, entries: TreatmentEntry[]): TreatmentButton => ({
    label,
    face: entries[0],
    entries,
  });
  const has = (sectionKey: string, groupKey: string) =>
    !!section(sections, sectionKey)?.groups.some(
      (group) => group.key === groupKey && group.items.length,
    );
  const typeEntry = (sectionKey: string, groupKey: string, label: string): TreatmentEntry[] =>
    has(sectionKey, groupKey) ? [{ kind: "type", label, sectionKey, groupKey }] : [];

  const rootCanal = itemsOf(sections, "root-canal-treatment");
  const rootCanalTypes = rootCanal.filter(
    (entry) => entry.kind === "item" && /-[123]-roots?$/.test(entry.entry.item.key),
  );
  const rootCanalRest = rootCanal.filter((entry) => !rootCanalTypes.includes(entry));
  const postIndex = rootCanalRest.findIndex(
    (entry) => entry.kind === "item" && entry.entry.item.key === "post-composite",
  );
  const rootCanalTail: TreatmentEntry[] = [...rootCanalRest];
  rootCanalTail.splice(postIndex < 0 ? rootCanalTail.length : postIndex + 1, 0, {
    kind: "step",
    label: PREPARATION_STEPS.postPreparation.name,
    step: "postPreparation",
  });

  return [
    make("Extraction", itemsOf(sections, "extraction")),
    make("Prosthesis removal", itemsOf(sections, "prosthesis-removal")),
    make("Filling", [
      ...itemsOf(sections, "filling"),
      { kind: "step", label: PREPARATION_STEPS.inlayPreparation.name, step: "inlayPreparation" },
      { kind: "step", label: PREPARATION_STEPS.onlayPreparation.name, step: "onlayPreparation" },
    ]),
    make("Dentures", itemsOf(sections, "dentures")),
    make("Root canal treatment", [
      ...(rootCanalTypes.length
        ? [{ kind: "roots" as const, label: "Root canal treatment by roots" }]
        : []),
      ...rootCanalTypes,
      ...rootCanalTail,
    ]),
    make("Implant", [
      ...typeEntry("implant", "implant", "Implant"),
      ...typeEntry("implant", "implant-abutment", "Abutment"),
      ...(has("implant", "implant") && has("implant", "implant-abutment")
        ? [{ kind: "implant-abutment" as const, label: "Implant + abutment" }]
        : []),
      ...typeEntry("implant", "one-phase-implant", "One-phase implant"),
      ...exceptGroups(itemsOf(sections, "implant"), [
        "implant",
        "implant-abutment",
        "one-phase-implant",
      ]),
    ]),
    make("Crown", [
      ...typeEntry("crown", "crown", "Crown"),
      ...exceptGroups(itemsOf(sections, "crown"), ["crown"]),
      ...itemsOf(sections, "veneer"),
      { kind: "step", label: PREPARATION_STEPS.veneerPreparation.name, step: "veneerPreparation" },
      { kind: "step", label: PREPARATION_STEPS.filing.name, step: "filing" },
    ]),
    { label: "Bridge", face: typeEntry("bridge", "bridge", "Bridge")[0], entries: [] },
    make("General", [
      { kind: "custom", label: "Other...", sectionKey: "general" },
      ...itemsOf(sections, "general"),
    ]),
    make("Other", [
      { kind: "custom", label: "Other...", sectionKey: "other" },
      ...itemsOf(sections, "other"),
    ]),
  ];
}

// ─── Adding ─────────────────────────────────────────────────────────────────

type NewItem = Omit<TreatmentItem, "id">;

function catalogItem(entry: CatalogEntry, toothNumber?: number): NewItem {
  return {
    name: entry.item.name,
    toothNumber,
    amount: 1,
    unitPrice: entry.item.price,
    priceMode: "unit",
    catalogSectionKey: entry.sectionKey,
    catalogGroupKey: entry.groupKey,
    catalogItemId: entry.item.id,
    catalogItemKey: entry.item.key,
    priceSource: "catalog",
    manualPriceOverride: false,
  };
}

// Steps and typed treatments have no price-list item; the API keeps them as
// free items in the section's "other" group.
function stepItem(step: StepKey, toothNumber?: number): NewItem {
  const definition = PREPARATION_STEPS[step];
  return {
    name: definition.name,
    toothNumber,
    amount: 1,
    unitPrice: 0,
    priceMode: "unit",
    catalogSectionKey: definition.sectionKey,
    catalogGroupKey: "other",
    catalogItemKey: definition.key,
    manualPriceOverride: false,
  };
}

function groupEntries(
  sections: PriceSection[],
  sectionKey: string,
  groupKey: string,
): CatalogEntry[] {
  const group = section(sections, sectionKey)?.groups.find(
    (candidate) => candidate.key === groupKey,
  );
  return group ? group.items.map((item) => ({ sectionKey, groupKey, item })) : [];
}

/** Upper teeth first, then lower, each in chart order from right to left. */
function byJaw(teeth: number[]) {
  const order = (tooth: number) => {
    const quadrant = Math.floor(tooth / 10);
    const position = tooth % 10;
    if (quadrant === 1) return 10 - position;
    if (quadrant === 2) return 10 + position;
    if (quadrant === 4) return 30 - position;
    return 30 + position;
  };
  const sorted = [...new Set(teeth)].sort((a, b) => order(a) - order(b));
  return [
    sorted.filter((tooth) => jawOf(tooth) === "upper"),
    sorted.filter((tooth) => jawOf(tooth) === "lower"),
  ].filter((jaw) => jaw.length);
}

/** Items a click on an entry adds for the selected teeth, in row order. */
export function itemsForEntry(
  entry: TreatmentEntry,
  teeth: number[],
  sections: PriceSection[],
  customName?: string,
): NewItem[] {
  const perJaw = (make: (tooth: number) => NewItem | null) =>
    byJaw(teeth).flatMap((jaw) => jaw.map(make).filter((item): item is NewItem => !!item));
  switch (entry.kind) {
    case "item":
      return teeth.length
        ? perJaw((tooth) => catalogItem(entry.entry, tooth))
        : [catalogItem(entry.entry)];
    case "type": {
      const first = groupEntries(sections, entry.sectionKey, entry.groupKey)[0];
      return first ? perJaw((tooth) => catalogItem(first, tooth)) : [];
    }
    case "roots": {
      const types = groupEntries(sections, "root-canal-treatment", "root-canal-treatment");
      const byRoots = (roots: number) =>
        types.find((candidate) => new RegExp(`-${roots}-roots?$`).test(candidate.item.key));
      return byJaw(teeth).flatMap((jaw) =>
        [1, 2, 3].flatMap((roots) => {
          const type = byRoots(roots);
          return type
            ? jaw
                .filter((tooth) => rootCount(tooth) === roots)
                .map((tooth) => catalogItem(type, tooth))
            : [];
        }),
      );
    }
    case "implant-abutment": {
      const implant = groupEntries(sections, "implant", "implant")[0];
      const abutment = groupEntries(sections, "implant", "implant-abutment")[0];
      return byJaw(teeth).flatMap((jaw) => [
        ...(implant ? jaw.map((tooth) => catalogItem(implant, tooth)) : []),
        ...(abutment ? jaw.map((tooth) => catalogItem(abutment, tooth)) : []),
      ]);
    }
    case "step":
      return perJaw((tooth) => stepItem(entry.step, tooth));
    case "custom": {
      const base: NewItem = {
        name: customName?.trim() || entry.label,
        amount: 1,
        unitPrice: 0,
        priceMode: "unit",
        catalogSectionKey: entry.sectionKey,
        catalogGroupKey: "other",
        manualPriceOverride: false,
      };
      return teeth.length ? perJaw((tooth) => ({ ...base, toothNumber: tooth })) : [base];
    }
  }
}

function entryState(entry: TreatmentEntry): number {
  switch (entry.kind) {
    case "item":
      return treatmentState({
        catalogSectionKey: entry.entry.sectionKey,
        catalogGroupKey: entry.entry.groupKey,
        catalogItemKey: entry.entry.item.key,
      });
    case "type":
      return treatmentState({
        catalogSectionKey: entry.sectionKey,
        catalogGroupKey: entry.groupKey,
      });
    case "roots":
      return STATE.rootCanal;
    case "implant-abutment":
      return STATE.implant;
    case "step":
      return PREPARATION_STEPS[entry.step].stateId;
    case "custom":
      return STATE.customTreatment;
  }
}

/** Whether the entry needs selected teeth before it can be added. */
export function needsTeeth(entry: TreatmentEntry) {
  return !TOOTHLESS_STATES.includes(entryState(entry));
}

/** Appends items to the last visit, opening the first visit if there is none. */
export function appendToLastVisit(
  rows: TreatmentRow[],
  items: TreatmentItem[],
  makeId: () => string,
): TreatmentRow[] {
  const next = [...rows];
  for (let index = next.length - 1; index >= 0; index--) {
    const row = next[index];
    if (row.kind === "visit" && !isTotalAdjustment(row)) {
      next[index] = { ...row, items: [...row.items, ...items] };
      return next;
    }
  }
  return [...next, { id: makeId(), kind: "visit", items }];
}

/** Switches every item of a row to another type of the same group. */
export function switchType(
  rows: TreatmentRow[],
  itemIds: string[],
  entry: CatalogEntry,
): TreatmentRow[] {
  return rows.map((row) =>
    row.kind !== "visit"
      ? row
      : {
          ...row,
          items: row.items.map((item) =>
            itemIds.includes(item.id)
              ? {
                  ...item,
                  name: entry.item.name,
                  unitPrice: entry.item.price,
                  catalogSectionKey: entry.sectionKey,
                  catalogGroupKey: entry.groupKey,
                  catalogItemId: entry.item.id,
                  catalogItemKey: entry.item.key,
                  priceSource: "catalog" as const,
                  manualPriceOverride: false,
                }
              : item,
          ),
        },
  );
}

// ─── Autocorrect ────────────────────────────────────────────────────────────

/** Clinical order Autocorrect puts the treatments of a visit in. */
export const AUTOCORRECT_ORDER = [
  33, 14, 207, 200, 201, 10, 11, 12, 924, 13, 320, 8, 6, 19, 17, 23, 25, 305, 315, 15, 9, 26, 302,
  18, 24, 304, 34, 27, 300,
];

// Preparation steps Autocorrect adds before the work that needs them.
const PREPARATIONS: { for: number[]; step: StepKey | "healingScrew"; skipIf: number[] }[] = [
  { for: [STATE.postWhite, STATE.post], step: "postPreparation", skipIf: [STATE.postPreparation] },
  { for: [STATE.crown, STATE.bridge], step: "filing", skipIf: [STATE.filed] },
  { for: [STATE.inlay], step: "inlayPreparation", skipIf: [STATE.inlayPreparation] },
  { for: [STATE.onlay], step: "onlayPreparation", skipIf: [STATE.onlayPreparation] },
  { for: [STATE.veneer], step: "veneerPreparation", skipIf: [STATE.veneerPreparation] },
  {
    for: [STATE.implant],
    step: "healingScrew",
    skipIf: [STATE.healingScrew, STATE.gingivaFormer, STATE.abutment],
  },
];

const NO_NATURAL_ROOT: number[] = [
  STATE.missing,
  STATE.extraction,
  STATE.implant,
  STATE.implantAlt,
  STATE.implantOnePhase,
  STATE.implantMini,
  STATE.implantTilted,
];

/** Teeth the diagnosis marks as missing or replaced by an implant. */
export function rootlessTeeth(entries: { toothId: number; stateId: number }[]): number[] {
  return [
    ...new Set(
      entries
        .filter((entry) => NO_NATURAL_ROOT.includes(entry.stateId))
        .map((entry) => entry.toothId),
    ),
  ];
}

function orderOf(stateId: number) {
  const index = AUTOCORRECT_ORDER.indexOf(stateId);
  return index < 0 ? AUTOCORRECT_ORDER.length : index;
}

function sameTreatment(item: TreatmentItem) {
  return JSON.stringify([
    item.catalogSectionKey,
    item.catalogGroupKey,
    item.catalogItemKey,
    item.name,
    item.unitPrice,
  ]);
}

/**
 * Reorders every visit into the clinical order, adds the missing preparation
 * steps for each tooth and brings rows of the same treatment and jaw together
 * so they show as one row.
 *
 * `rootless` lists teeth without a natural root (missing, implant) where no
 * filing is added under a crown or bridge.
 */
export function autocorrect(
  rows: TreatmentRow[],
  sections: PriceSection[],
  rootless: number[],
  makeId: () => string,
): TreatmentRow[] {
  const healingScrew = groupEntries(sections, "implant", "implant-accessories").find(
    (entry) => entry.item.key === "healing-screw",
  );
  return rows.map((row) => {
    if (row.kind !== "visit") return row;
    const items = [...row.items];
    const states = (tooth: number) =>
      items.filter((item) => item.toothNumber === tooth).map((item) => treatmentState(item));
    for (const item of row.items) {
      const tooth = item.toothNumber;
      if (tooth == null) continue;
      const state = treatmentState(item);
      for (const preparation of PREPARATIONS) {
        if (!preparation.for.includes(state)) continue;
        if (preparation.skipIf.some((skip) => states(tooth).includes(skip))) continue;
        if (
          preparation.step === "filing" &&
          (rootless.includes(tooth) || states(tooth).some((s) => NO_NATURAL_ROOT.includes(s)))
        ) {
          continue;
        }
        if (preparation.step === "healingScrew") {
          if (healingScrew) items.push({ ...catalogItem(healingScrew, tooth), id: makeId() });
        } else {
          items.push({ ...stepItem(preparation.step, tooth), id: makeId() });
        }
      }
    }
    const sorted = items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const byState = orderOf(treatmentState(a.item)) - orderOf(treatmentState(b.item));
        if (byState) return byState;
        const byTreatment = sameTreatment(a.item).localeCompare(sameTreatment(b.item));
        if (byTreatment) return byTreatment;
        const jawA = a.item.toothNumber == null ? 2 : jawOf(a.item.toothNumber) === "upper" ? 0 : 1;
        const jawB = b.item.toothNumber == null ? 2 : jawOf(b.item.toothNumber) === "upper" ? 0 : 1;
        return jawA - jawB || a.index - b.index;
      })
      .map(({ item }) => item);
    return { ...row, items: sorted };
  });
}

// ─── Drawing ────────────────────────────────────────────────────────────────

/** Planned work per tooth, in plan order, for the treatment chart. */
export function plannedStates(rows: TreatmentRow[]): PlannedState[] {
  const out: PlannedState[] = [];
  for (const row of rows) {
    if (row.kind !== "visit") continue;
    for (const item of row.items) {
      if (item.toothNumber == null) continue;
      out.push({ toothId: item.toothNumber, stateId: treatmentState(item) });
    }
  }
  return out;
}
