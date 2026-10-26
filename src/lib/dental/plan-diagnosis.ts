import type { ToothState, ToothStatus } from "@/lib/patients-store";
import type { StatusEntry } from "./diagnosis-engine";
import {
  DIAGNOSIS_BUTTONS,
  EXTRA_DIAGNOSIS_LABELS,
  STATE,
  STATE_LABELS,
  statusLabel,
} from "./states";

// Bridges the stacked diagnosis model and the plan as the API stores it: each
// tooth row keeps its chips in `diagnosis` (structured objects) and a readable
// summary in `status`/`note` for reports; whole-mouth chips are the plan's
// general statuses.

const LABEL_TO_STATES = new Map<string, number[]>();
for (const button of DIAGNOSIS_BUTTONS) {
  for (const item of button.items) {
    if (!item.custom) LABEL_TO_STATES.set(item.label.toLowerCase(), item.stateIds);
  }
}
for (const [id, label] of Object.entries(STATE_LABELS)) {
  if (label.status && !LABEL_TO_STATES.has(label.status.toLowerCase())) {
    LABEL_TO_STATES.set(label.status.toLowerCase(), [Number(id)]);
  }
}

const DETAIL_KEYS = new Map<string, string>();
for (const [key, label] of Object.entries(EXTRA_DIAGNOSIS_LABELS)) {
  DETAIL_KEYS.set(key.toLowerCase(), key);
  DETAIL_KEYS.set(label.toLowerCase(), key);
}
DETAIL_KEYS.set("secondary caries", "SecunderCaries");

function detailKeys(values: string[]) {
  return values
    .map((value) => DETAIL_KEYS.get(value.trim().toLowerCase()))
    .filter((key): key is string => Boolean(key));
}

const LEGACY_STATUS_STATES: Record<ToothStatus, number[]> = {
  intact: [STATE.intact],
  missing: [STATE.missing],
  caries: [STATE.caries],
  filled: [STATE.filledAmalgam],
  crown: [STATE.filed, STATE.crown],
  "root-treated": [STATE.intact, STATE.rootCanal],
  implant: [STATE.implant, STATE.abutment],
  bridge: [STATE.filed, STATE.bridge],
};

/** Reads a tooth saved before chips could stack: one status, a label and details. */
export function legacyEntries(tooth: ToothState): StatusEntry[] {
  const toothId = tooth.number;
  const note = tooth.note?.trim();
  const fromNote = note ? LABEL_TO_STATES.get(note.toLowerCase()) : undefined;
  const details = detailKeys(tooth.diagnosis ?? []);
  let stateIds = fromNote ?? LEGACY_STATUS_STATES[tooth.status] ?? [STATE.intact];
  let title: string | undefined;
  if (note && !fromNote) {
    // A free-text finding from the General / Other dialog.
    if (tooth.status !== "intact") {
      const base = LEGACY_STATUS_STATES[tooth.status].map((stateId) => ({ toothId, stateId }));
      return [...base, { toothId, stateId: STATE.customStatus, title: note, baseTitle: note }];
    }
    stateIds = [STATE.customStatus];
    title = note;
  }
  return stateIds.map((stateId, index) => {
    const last = index === stateIds.length - 1;
    const label = title ?? statusLabel(stateId);
    const extraDiagnosis = last && details.length ? details.join(",") : undefined;
    return {
      toothId,
      stateId,
      title: extraDiagnosis
        ? `${label} - ${details.map((key) => EXTRA_DIAGNOSIS_LABELS[key] ?? key).join(", ")}`
        : label,
      baseTitle: label,
      extraDiagnosis,
      auto: stateId === STATE.filed ? true : undefined,
    };
  });
}

/** Whole-mouth chips are stored as their titles, e.g. "Malocclusion - Class II". */
export function generalEntry(label: string, index: number): StatusEntry {
  const [base, ...rest] = label.split(" - ");
  const stateIds = LABEL_TO_STATES.get(base.trim().toLowerCase());
  const stateId = stateIds?.length === 1 ? stateIds[0] : STATE.general;
  const details = stateId === STATE.general ? [] : detailKeys(rest.join(" - ").split(","));
  return {
    toothId: 0,
    stateId,
    title: label,
    baseTitle: stateId === STATE.general ? label : base.trim(),
    extraDiagnosis: details.length ? details.join(",") : undefined,
    ts: index,
  };
}

/** All chips of a plan, tooth by tooth, with the whole-mouth ones on tooth 0. */
export function planEntries(
  teeth: Record<number, ToothState>,
  generalStatuses: string[] = [],
): StatusEntry[] {
  const out: StatusEntry[] = generalStatuses.map(generalEntry);
  for (const tooth of Object.values(teeth)) {
    const entries = tooth.statuses ?? legacyEntries(tooth);
    out.push(...entries.map((entry) => ({ ...entry, toothId: tooth.number })));
  }
  return out;
}

/** The single status older screens and the reports still read. */
export function legacyStatus(entries: StatusEntry[]): ToothStatus {
  const ids = entries.map((entry) => entry.stateId);
  const has = (...states: number[]) => states.some((state) => ids.includes(state));
  if (has(STATE.bridge, STATE.temporaryProsthesis, STATE.overdentures)) return "bridge";
  if (
    has(
      STATE.implant,
      STATE.implantAlt,
      STATE.implantOnePhase,
      STATE.implantMini,
      STATE.implantTilted,
    )
  )
    return "implant";
  if (has(STATE.missing) && !has(STATE.dentures)) return "missing";
  if (has(STATE.crown, STATE.goldCrown)) return "crown";
  if (has(STATE.rootCanal, STATE.rootCanalAlt)) return "root-treated";
  if (has(STATE.caries)) return "caries";
  if (has(STATE.filledAmalgam, STATE.filledComposite, STATE.inlay, STATE.filling)) return "filled";
  return "intact";
}

export function summaryNote(entries: StatusEntry[]) {
  const titles = entries
    .filter((entry) => !entry.auto && entry.stateId !== STATE.intact)
    .map((entry) => entry.title || statusLabel(entry.stateId));
  return titles.length ? titles.join(", ") : undefined;
}

/** Writes edited chips back onto the plan's teeth and general statuses. */
export function diagnosisPatch(teeth: Record<number, ToothState>, entries: StatusEntry[]) {
  const nextTeeth: Record<number, ToothState> = {};
  for (const tooth of Object.values(teeth)) {
    const own = entries
      .filter((entry) => entry.toothId === tooth.number)
      .map(({ toothId: _tooth, ...rest }) => ({ toothId: tooth.number, ...rest }));
    const statuses = own.length ? own : [{ toothId: tooth.number, stateId: STATE.intact }];
    nextTeeth[tooth.number] = {
      number: tooth.number,
      status: legacyStatus(statuses),
      note: summaryNote(statuses),
      statuses,
    };
  }
  const generalStatuses = entries
    .filter((entry) => entry.toothId === 0)
    .map((entry) => entry.title || statusLabel(entry.stateId));
  return { teeth: nextTeeth, generalStatuses };
}

interface ApiStatus {
  state_id: number;
  title?: string | null;
  base_title?: string | null;
  extra_diagnosis?: string | null;
  ts?: number | null;
  auto?: boolean | null;
}

export function isStructuredDiagnosis(value: unknown): value is ApiStatus[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "object" && item !== null && "state_id" in item)
  );
}

export function entriesFromApi(toothId: number, value: ApiStatus[]): StatusEntry[] {
  return value.map((item) => ({
    toothId,
    stateId: Number(item.state_id),
    title: item.title ?? undefined,
    baseTitle: item.base_title ?? undefined,
    extraDiagnosis: item.extra_diagnosis ?? undefined,
    ts: item.ts ?? undefined,
    auto: item.auto ?? undefined,
  }));
}

export function entriesToApi(entries: StatusEntry[]): ApiStatus[] {
  return entries.map((entry) => ({
    state_id: entry.stateId,
    title: entry.title ?? statusLabel(entry.stateId),
    base_title: entry.baseTitle ?? null,
    extra_diagnosis: entry.extraDiagnosis ?? null,
    ts: entry.ts ?? null,
    auto: entry.auto ?? false,
  }));
}
