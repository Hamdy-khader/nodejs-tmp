import type { StatusEntry } from "./diagnosis-engine";
import { GENERAL_STATE_IDS, STATE } from "./states";

export type Surface = "M" | "O" | "D" | "L" | "B";
export type SpotKind = "caries" | "amalgam" | "composite" | "filling" | "inlay" | "onlay";
export type CrownShape =
  | "natural"
  | "none"
  | "worn"
  | "fractured"
  | "filed"
  | "core"
  | "telescopic";
export type CrownFill = "white" | "gray" | "discolored" | "planned" | "temporary";

export interface Spot {
  kind: SpotKind;
  /** Undefined draws the tooth's default spot (occlusal at the back, side at the front). */
  surface?: Surface;
  planned: boolean;
}

/** Everything the odontogram needs to draw one tooth. */
export interface ToothVisual {
  toothId: number;
  /** False when nothing stands in the socket: missing or extracted with no replacement. */
  present: boolean;
  /** A planned extraction draws a green cross where the tooth was. */
  extraction: boolean;
  /** Natural root visible (false for implants, missing teeth, pontics and denture teeth). */
  naturalRoot: boolean;
  implant?: { onePhase: boolean; planned: boolean };
  abutment?: { planned: boolean };
  healingCap?: { planned: boolean };
  rootCanal?: { planned: boolean };
  post?: { planned: boolean };
  pins?: { planned: boolean };
  crown: { shape: CrownShape; fill: CrownFill };
  veneer?: { planned: boolean };
  veneerPreparation: boolean;
  impacted: boolean;
  spots: Spot[];
  bridge?: { planned: boolean; temporary: boolean; pontic: boolean };
  dentures?: { planned: boolean };
  bar?: { planned: boolean };
  attachment?: { planned: boolean };
  drift?: "front" | "back";
  /** The circle around the tooth number. */
  marker: "none" | "status" | "planned";
}

/** A planned treatment on a tooth, in the order the steps were added. */
export interface PlannedState {
  toothId: number;
  stateId: number;
  extraDiagnosis?: string;
}

const SURFACE_STATES: Record<number, SpotKind> = {
  [STATE.caries]: "caries",
  [STATE.filledAmalgam]: "amalgam",
  [STATE.filledComposite]: "composite",
  [STATE.filling]: "filling",
  [STATE.goldFilling]: "amalgam",
};

function surfaces(extraDiagnosis?: string): (Surface | undefined)[] {
  const picked = (extraDiagnosis ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is Surface => ["M", "O", "D", "L", "B"].includes(value));
  return picked.length ? picked : [undefined];
}

function natural(toothId: number): ToothVisual {
  return {
    toothId,
    present: true,
    extraction: false,
    naturalRoot: true,
    crown: { shape: "natural", fill: "white" },
    veneerPreparation: false,
    impacted: false,
    spots: [],
    marker: "none",
  };
}

// Takes the tooth back to an empty socket: what replaces it (implant, pontic,
// denture tooth) is added by the following states.
function clearSocket(visual: ToothVisual) {
  visual.present = false;
  visual.naturalRoot = false;
  visual.implant = undefined;
  visual.abutment = undefined;
  visual.healingCap = undefined;
  visual.rootCanal = undefined;
  visual.post = undefined;
  visual.pins = undefined;
  visual.crown = { shape: "none", fill: "white" };
  visual.veneer = undefined;
  visual.veneerPreparation = false;
  visual.impacted = false;
  visual.spots = [];
}

function clearCrownWork(visual: ToothVisual) {
  visual.spots = [];
  visual.veneer = undefined;
  visual.veneerPreparation = false;
}

function applyState(
  visual: ToothVisual,
  stateId: number,
  planned: boolean,
  extraDiagnosis?: string,
) {
  const kind = SURFACE_STATES[stateId];
  if (kind) {
    if (visual.crown.shape === "none") return;
    for (const surface of surfaces(extraDiagnosis)) {
      visual.spots = visual.spots.filter(
        (spot) => !(spot.surface === surface && spot.kind !== kind),
      );
      visual.spots.push({ kind, surface, planned });
    }
    return;
  }
  switch (stateId) {
    case STATE.intact:
      return;
    case STATE.missing:
      clearSocket(visual);
      return;
    case STATE.extraction:
      clearSocket(visual);
      visual.extraction = planned;
      return;
    case STATE.radix:
      visual.crown = { shape: "none", fill: "white" };
      clearCrownWork(visual);
      return;
    case STATE.worn:
      visual.crown = { shape: "worn", fill: "gray" };
      return;
    case STATE.fractured:
      visual.crown = { shape: "fractured", fill: "gray" };
      return;
    case STATE.discolored:
      visual.crown = {
        shape: visual.crown.shape === "none" ? "natural" : visual.crown.shape,
        fill: "discolored",
      };
      return;
    case STATE.impacted:
      visual.impacted = true;
      return;
    case STATE.inlay:
      visual.spots.push({ kind: "inlay", surface: "O", planned });
      return;
    case STATE.onlay:
      visual.spots.push({ kind: "onlay", surface: "O", planned });
      return;
    case STATE.rootCanal:
    case STATE.rootCanalAlt:
      if (visual.naturalRoot) visual.rootCanal = { planned };
      return;
    case STATE.post:
    case STATE.postWhite:
      // The post replaces the natural crown with a build-up core; a crown
      // applied afterwards covers it again.
      visual.post = { planned };
      visual.crown = { shape: "core", fill: planned ? "planned" : "gray" };
      clearCrownWork(visual);
      return;
    case STATE.postPreparation:
    case STATE.inlayPreparation:
    case STATE.onlayPreparation:
      if (stateId === STATE.postPreparation) {
        visual.crown = { shape: "none", fill: "white" };
        clearCrownWork(visual);
      }
      return;
    case STATE.parapulpalPin:
      visual.pins = { planned };
      return;
    case STATE.filed:
    case STATE.prosthesisRemoval:
      visual.bridge = undefined;
      visual.crown = { shape: "filed", fill: planned ? "planned" : "white" };
      clearCrownWork(visual);
      return;
    case STATE.crown:
    case STATE.goldCrown:
      visual.crown = { shape: "natural", fill: planned ? "planned" : "gray" };
      clearCrownWork(visual);
      return;
    case STATE.bridge:
    case STATE.temporaryProsthesis: {
      const temporary = stateId === STATE.temporaryProsthesis;
      const pontic = !visual.present && !visual.implant;
      visual.present = true;
      visual.extraction = false;
      visual.bridge = { planned, temporary, pontic };
      visual.crown = {
        shape: "natural",
        fill: temporary ? "temporary" : planned ? "planned" : "gray",
      };
      clearCrownWork(visual);
      return;
    }
    case STATE.dentures:
    case STATE.overdentures:
    case STATE.denturesFixed:
    case STATE.denturesPartialPlate:
    case STATE.partialDentures:
      visual.present = true;
      visual.extraction = false;
      visual.dentures = { planned };
      if (!visual.implant) visual.naturalRoot = false;
      visual.crown = { shape: "natural", fill: planned ? "planned" : "white" };
      clearCrownWork(visual);
      return;
    case STATE.veneer:
      visual.veneer = { planned };
      return;
    case STATE.veneerPreparation:
      visual.veneerPreparation = true;
      return;
    case STATE.implant:
    case STATE.implantAlt:
    case STATE.implantTilted:
    case STATE.implantMini:
    case STATE.implantOnePhase:
      clearSocket(visual);
      visual.present = true;
      visual.extraction = false;
      visual.implant = { onePhase: stateId === STATE.implantOnePhase, planned };
      return;
    case STATE.abutment:
    case STATE.abutmentBioHpp:
      // An abutment always sits on an implant; without one the existing
      // implant is assumed and drawn grey.
      if (!visual.implant) {
        clearSocket(visual);
        visual.implant = { onePhase: false, planned: false };
      }
      visual.present = true;
      visual.abutment = { planned };
      visual.healingCap = undefined;
      return;
    case STATE.healingScrew:
    case STATE.gingivaFormer:
      if (!visual.implant) {
        clearSocket(visual);
        visual.implant = { onePhase: false, planned: false };
      }
      visual.present = true;
      visual.healingCap = { planned };
      return;
    case STATE.telescopicCrown:
      visual.crown = { shape: "telescopic", fill: planned ? "planned" : "gray" };
      return;
    case STATE.abutmentBar:
      visual.bar = { planned };
      return;
    case STATE.preciVertix:
      visual.attachment = { planned };
      return;
    case STATE.driftedFront:
      visual.drift = "front";
      return;
    case STATE.driftedBack:
      visual.drift = "back";
      return;
    default:
      return;
  }
}

// A preparation always lies under the restoration it is for, even when its row
// comes after that restoration's row.
const PREPARATIONS: number[] = [
  STATE.filed,
  STATE.postPreparation,
  STATE.inlayPreparation,
  STATE.onlayPreparation,
  STATE.veneerPreparation,
];

/**
 * Builds the drawing for one tooth from its diagnosis chips and, in treatment
 * mode, the planned steps that touch it. Later states win, the way a clinician
 * reads the plan: the extraction removes the tooth, the implant replaces the
 * root, the crown covers the filing.
 */
export function buildToothVisual(
  toothId: number,
  entries: StatusEntry[],
  planned: PlannedState[] = [],
): ToothVisual {
  const visual = natural(toothId);
  const own = entries.filter((entry) => entry.toothId === toothId);
  let diagnosed = false;
  for (const entry of own) {
    applyState(visual, entry.stateId, false, entry.extraDiagnosis);
    if (entry.stateId !== STATE.intact && entry.stateId !== STATE.missing) diagnosed = true;
  }
  if (own.some((entry) => GENERAL_STATE_IDS.includes(entry.stateId))) diagnosed = true;
  const steps = planned
    .filter((step) => step.toothId === toothId)
    .sort(
      (a, b) =>
        Number(!PREPARATIONS.includes(a.stateId)) - Number(!PREPARATIONS.includes(b.stateId)),
    );
  for (const step of steps) applyState(visual, step.stateId, true, step.extraDiagnosis);
  // Any planned step turns the number green, even ones with nothing to draw
  // (impression, custom treatment); otherwise a finding gives a grey circle.
  visual.marker = steps.length ? "planned" : diagnosed ? "status" : "none";
  return visual;
}

export function buildMouthVisuals(entries: StatusEntry[], planned: PlannedState[] = []) {
  const out: Record<number, ToothVisual> = {};
  for (const quadrant of [1, 2, 3, 4]) {
    for (let position = 1; position <= 8; position++) {
      const toothId = quadrant * 10 + position;
      out[toothId] = buildToothVisual(toothId, entries, planned);
    }
  }
  return out;
}

/** Connector segments between neighbouring bridge units in chart order. */
export function bridgeConnectors(order: number[], visuals: Record<number, ToothVisual>) {
  const links: { from: number; to: number; planned: boolean; temporary: boolean }[] = [];
  for (let index = 0; index < order.length - 1; index++) {
    const left = visuals[order[index]]?.bridge;
    const right = visuals[order[index + 1]]?.bridge;
    if (left && right && left.planned === right.planned && left.temporary === right.temporary) {
      links.push({
        from: order[index],
        to: order[index + 1],
        planned: left.planned,
        temporary: left.temporary,
      });
    }
  }
  return links;
}

/** Continuous denture bases (pink gum) in chart order. */
export function dentureRuns(order: number[], visuals: Record<number, ToothVisual>) {
  const runs: { teeth: number[]; planned: boolean }[] = [];
  for (const toothId of order) {
    const dentures = visuals[toothId]?.dentures;
    const last = runs.at(-1);
    if (!dentures) continue;
    const previous = order[order.indexOf(toothId) - 1];
    if (last && last.teeth.at(-1) === previous && last.planned === dentures.planned)
      last.teeth.push(toothId);
    else runs.push({ teeth: [toothId], planned: dentures.planned });
  }
  return runs;
}
