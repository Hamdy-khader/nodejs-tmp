import { GENERAL_STATE_IDS, STATE, shortLabel, statusLabel } from "./states";

/** One diagnosis on one tooth. Tooth 0 holds whole-mouth findings. */
export interface StatusEntry {
  toothId: number;
  stateId: number;
  /** Chip text: the label plus any extra details, e.g. "Caries - M, O". */
  title?: string;
  /** The label without details, kept so the details can be edited again. */
  baseTitle?: string;
  /** Comma separated detail keys from EXTRA_DIAGNOSIS, e.g. "M,O". */
  extraDiagnosis?: string;
  /** Applied together in one click; used to find the entry again for editing. */
  ts?: number;
  /** Added by the engine (filed under a crown), not chosen by the user. */
  auto?: boolean;
}

export interface ApplyRequest {
  teeth: number[];
  stateIds: number[];
  /** Free text from the General / Other dialog. */
  title?: string;
  now?: number;
}

export interface ApplyResult {
  entries: StatusEntry[];
  applied: boolean;
  /** Shown to the user; when the result is not applied it explains why. */
  message?: string;
  /** The teeth the states landed on (drifted states move to a neighbour). */
  teeth: number[];
  ts: number;
  /** Undo/redo hint, e.g. "caries". */
  undoLabel?: string;
}

const L = [
  STATE.general,
  401,
  402,
  403,
  404,
  405,
  406,
  407,
  408,
  409,
  410,
  411,
  412,
  413,
  414,
  415,
  416,
  417,
  418,
  419,
  STATE.driftedFront,
  STATE.driftedBack,
];
const IMPLANT_LIKE = [2, 10, 11, 12, 13, 31, 318, 322];

type Prune = { keepOnly: number[] } | { remove: number[]; addIntactWhenRemoved?: boolean };

// What a new state does to the states already on the tooth. Measured against
// every pair of states on the reference implementation; states not listed here
// keep everything that is already there.
const PRUNE: Record<number, Prune> = {
  1: { keepOnly: [] },
  2: { keepOnly: [208, ...L] },
  3: { keepOnly: [208, 30, 16, 28, 4, 5, 18, 201, 34, ...L] },
  4: { keepOnly: [208, 30, 16, 28, 5, 18, 3, 201, 34, ...L] },
  5: { keepOnly: [208, 30, 16, 28, 4, 18, 3, 201, 34, ...L] },
  16: { keepOnly: [208, 4, 5, 3, 201, 34, ...L] },
  28: { keepOnly: [208, 4, 5, 3, 201, 34, ...L] },
  30: { keepOnly: [208, 4, 5, 3, 201, 34, ...L] },
  18: { keepOnly: [208, 4, 5, 3, 201, 34, ...L] },
  29: { keepOnly: [208, 201, 34, ...L] },
  31: { keepOnly: [208, ...L] },
  7: { keepOnly: [208, 201, 9, ...L] },
  26: { keepOnly: [208, 201, ...L] },
  10: { keepOnly: [208, 9, 15, ...L] },
  11: { keepOnly: [208, 9, 15, ...L] },
  9: { remove: [9, 15, 19, 18] },
  15: { remove: [9, 15, 19, 18] },
  19: { remove: [10, 11, 318, 322, 12, 13, 15, 9, 30, 31, 19, 18, 4, 5] },
  201: { remove: IMPLANT_LIKE, addIntactWhenRemoved: true },
  34: { remove: [...IMPLANT_LIKE, 34], addIntactWhenRemoved: true },
};

// Chip order on a tooth; states not listed follow in the order they were added.
const WEIGHT = [
  1, 2, 31, 201, 16, 28, 30, 18, 3, 4, 5, 318, 322, 10, 11, 12, 13, 34, 19, 8, 6, 7, 9, 15, 207,
  208,
];

// Crown and bridge keep these, everything else on the tooth goes under the filing.
const PROSTHETIC_BASE = [6, 7, 9, 10, 11, 12, 13, 15, 19, 318, 322];
const ROOT_AND_GENERAL = [
  201, 204, 207, 208, 34, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
  415, 416, 417, 418, 419,
];

export const INLAY_TEETH_MESSAGE = "Inlay can only be added to the back teeth";
export const BRIDGE_PILLAR_MESSAGE = "Set a pillar for the bridge";
export const SELECT_TOOTH_MESSAGE = "Select a tooth";

export function isGeneralState(stateId: number) {
  return GENERAL_STATE_IDS.includes(stateId);
}

function sortEntries(entries: StatusEntry[]) {
  const weight = (entry: StatusEntry) => {
    const index = WEIGHT.indexOf(entry.stateId);
    return index < 0 ? 999 : index;
  };
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) =>
        a.entry.toothId - b.entry.toothId || weight(a.entry) - weight(b.entry) || a.index - b.index,
    )
    .map(({ entry }) => entry);
}

function prune(entries: StatusEntry[], toothId: number, stateId: number) {
  const rule = PRUNE[stateId];
  if (!rule) return entries;
  const others = entries.filter((entry) => entry.toothId !== toothId);
  const own = entries.filter((entry) => entry.toothId === toothId);
  if ("keepOnly" in rule) {
    return [...others, ...own.filter((entry) => rule.keepOnly.includes(entry.stateId))];
  }
  const kept = own.filter((entry) => !rule.remove.includes(entry.stateId));
  const removedImplantLike =
    rule.addIntactWhenRemoved && own.some((entry) => IMPLANT_LIKE.includes(entry.stateId));
  const intact = removedImplantLike && !kept.some((entry) => entry.stateId === STATE.intact);
  return [...others, ...(intact ? [{ toothId, stateId: STATE.intact }] : []), ...kept];
}

function removeState(entries: StatusEntry[], toothId: number, stateId: number) {
  return entries.filter((entry) => !(entry.toothId === toothId && entry.stateId === stateId));
}

// A crown or bridge sits on a filed tooth: anything that is not a root finding or
// an existing prosthesis is replaced by the filing. A healing screw under the new
// crown becomes an abutment.
function addFiled(entries: StatusEntry[], toothId: number, bridge: boolean) {
  const keepAsBase = bridge ? [2, 300, ...PROSTHETIC_BASE] : PROSTHETIC_BASE;
  let next = [...entries];
  let covered = false;
  let implant = false;
  let abutment = false;
  for (let index = next.length - 1; index >= 0; index--) {
    const entry = next[index];
    if (entry.toothId !== toothId) continue;
    if (!keepAsBase.includes(entry.stateId)) {
      if (!ROOT_AND_GENERAL.includes(entry.stateId)) next.splice(index, 1);
      if (!covered) next.push({ toothId, stateId: STATE.filed, auto: true });
      covered = true;
    } else {
      if (entry.stateId === STATE.implant) implant = true;
      if (entry.stateId === STATE.abutment) abutment = true;
      covered = true;
    }
  }
  if (implant && !abutment) {
    covered = true;
    next = removeState(next, toothId, STATE.healingScrew);
    next.push({ toothId, stateId: STATE.abutment, auto: true });
  }
  if (!covered) next.push({ toothId, stateId: STATE.filed, auto: true });
  return next;
}

// Dentures replace a missing tooth; a natural tooth under them is marked missing.
function addDenturesBase(entries: StatusEntry[], toothId: number) {
  const hasBase = entries.some(
    (entry) => entry.toothId === toothId && [2, 10, 11, 318, 322].includes(entry.stateId),
  );
  if (hasBase) return entries;
  return [...removeState(entries, toothId, STATE.intact), { toothId, stateId: STATE.missing }];
}

/** The neighbour a drifted tooth moves to: front is towards the midline. */
export function driftedTarget(toothId: number, direction: -1 | 1) {
  const target = toothId + direction;
  const wrap: Record<number, number> = {
    10: 21,
    20: 11,
    30: 41,
    40: 31,
    19: 18,
    29: 28,
    39: 38,
    49: 48,
  };
  return wrap[target] ?? target;
}

function hasRoot(entries: StatusEntry[], toothId: number) {
  return !entries.some((entry) => entry.toothId === toothId && entry.stateId === STATE.missing);
}

function validate(entries: StatusEntry[], stateId: number, teeth: number[]) {
  if (stateId === STATE.inlay && teeth.some((tooth) => tooth % 10 < 4 || tooth % 10 > 8)) {
    return { message: INLAY_TEETH_MESSAGE, fatal: true };
  }
  if (stateId === STATE.bridge && teeth.length >= 2) {
    const pillars = teeth.filter((tooth) => hasRoot(entries, tooth)).length;
    if (pillars < 2) return { message: BRIDGE_PILLAR_MESSAGE, fatal: false };
  }
  return null;
}

/**
 * Applies a diagnosis button to the selected teeth: prunes what the new state
 * replaces, adds the automatic companions (filing under a crown, missing under
 * dentures) and keeps every tooth's chips in the clinical order.
 */
export function applyDiagnosis(entries: StatusEntry[], request: ApplyRequest): ApplyResult {
  const ts = request.now ?? Date.now();
  const stateIds = request.stateIds;
  const first = stateIds[0];
  let teeth = [...request.teeth];
  if (!teeth.length) {
    if (!isGeneralState(first)) {
      return { entries, applied: false, message: SELECT_TOOTH_MESSAGE, teeth, ts };
    }
    teeth = [0];
  }

  let next = entries.map((entry) => ({ ...entry }));
  if (first === STATE.driftedFront || first === STATE.driftedBack) {
    next = moveDrifted(next, teeth, first === STATE.driftedFront ? -1 : 1);
  }

  const problem = validate(next, first, teeth);
  if (problem?.fatal) return { entries, applied: false, message: problem.message, teeth, ts };

  for (const stateId of stateIds) for (const tooth of teeth) next = prune(next, tooth, stateId);

  const landed: number[] = [];
  for (const stateId of stateIds) {
    for (const selected of teeth) {
      let tooth = selected;
      let title = request.title;
      if (stateId === STATE.bridge || stateId === STATE.crown) {
        next = removeState(next, tooth, STATE.dentures);
        next = addFiled(next, tooth, stateId === STATE.bridge);
      }
      if (stateId === STATE.dentures) next = addDenturesBase(next, tooth);
      if (stateId === STATE.driftedFront || stateId === STATE.driftedBack) {
        const target = driftedTarget(tooth, stateId === STATE.driftedFront ? -1 : 1);
        title = `Drifted (${tooth} → ${target})`;
        tooth = target;
      }
      const label = statusLabel(stateId);
      // Re-applying a state replaces it; free-text findings can repeat.
      if (stateId !== STATE.customStatus && stateId !== STATE.general) {
        next = removeState(next, tooth, stateId);
      }
      next.push({ toothId: tooth, stateId, title: title || label, baseTitle: title || label, ts });
      if (!landed.includes(tooth)) landed.push(tooth);
    }
  }

  return {
    entries: sortEntries(next),
    applied: true,
    message: problem?.message,
    teeth: landed,
    ts,
    undoLabel: shortLabel(first),
  };
}

// A drifted tooth leaves its place empty; its findings travel with it to the
// neighbouring position.
function moveDrifted(entries: StatusEntry[], teeth: number[], direction: -1 | 1) {
  let next = entries;
  for (const tooth of teeth) {
    const target = driftedTarget(tooth, direction);
    if (target === tooth) {
      next = [
        ...next.filter((entry) => entry.toothId !== tooth),
        { toothId: tooth, stateId: STATE.missing },
      ];
      continue;
    }
    const moving = next.filter(
      (entry) => entry.toothId === tooth && !isGeneralState(entry.stateId),
    );
    next = [
      ...next.filter((entry) => entry.toothId !== tooth && entry.toothId !== target),
      ...moving.map((entry) => ({ ...entry, toothId: target })),
      { toothId: tooth, stateId: STATE.missing },
    ];
  }
  return next;
}

/** Deletes one chip; removing a crown or bridge also removes its filing. */
export function removeDiagnosis(entries: StatusEntry[], target: StatusEntry): StatusEntry[] {
  let next = entries.filter((entry) => entry !== target);
  if (target.stateId === STATE.crown || target.stateId === STATE.bridge) {
    next = removeState(next, target.toothId, STATE.filed);
  }
  return next;
}

/** Stores the details picked in the side panel on every entry of one click. */
export function setExtraDiagnosis(
  entries: StatusEntry[],
  match: { ts?: number; stateId: number; teeth: number[] },
  selected: string[],
  suffix: string,
): StatusEntry[] {
  return entries.map((entry) => {
    if (entry.stateId !== match.stateId || !match.teeth.includes(entry.toothId)) return entry;
    if (match.ts !== undefined && entry.ts !== match.ts) return entry;
    const baseTitle = entry.baseTitle || entry.title || statusLabel(entry.stateId);
    return { ...entry, baseTitle, title: baseTitle + suffix, extraDiagnosis: selected.join(",") };
  });
}

export function entriesForTooth(entries: StatusEntry[], toothId: number) {
  return entries.filter((entry) => entry.toothId === toothId);
}
