// Parametric tooth anatomy for the odontogram. Every tooth is drawn in a
// 40 × 80 box with the crown at the bottom and the roots pointing up (upper
// jaw orientation); lower teeth are flipped vertically when rendered. Shapes
// are built for the right side of the mouth, where mesial faces the midline
// on the right; the left side mirrors them horizontally.

export const VIEW_W = 40;
export const VIEW_H = 80;

interface ToothSpec {
  /** Widest point of the crown. */
  crownW: number;
  /** Crown width where it meets the root. */
  neckW: number;
  crownH: number;
  /** Cusp count on the biting edge; 0 is a flat incisal edge, 1 a canine tip. */
  cusps: number;
  roots: { from: number; to: number; apexX: number; length: number }[];
}

// Root spans are fractions of the neck width (0 = distal edge, 1 = mesial edge).
const UPPER: Record<number, ToothSpec> = {
  1: {
    crownW: 30,
    neckW: 21,
    crownH: 34,
    cusps: 0,
    roots: [{ from: 0.08, to: 0.92, apexX: 0.5, length: 35 }],
  },
  2: {
    crownW: 25,
    neckW: 18,
    crownH: 31,
    cusps: 0,
    roots: [{ from: 0.1, to: 0.9, apexX: 0.45, length: 33 }],
  },
  3: {
    crownW: 28,
    neckW: 20,
    crownH: 34,
    cusps: 1,
    roots: [{ from: 0.08, to: 0.92, apexX: 0.45, length: 40 }],
  },
  4: {
    crownW: 30,
    neckW: 22,
    crownH: 30,
    cusps: 2,
    roots: [
      { from: 0.05, to: 0.47, apexX: 0.18, length: 33 },
      { from: 0.53, to: 0.95, apexX: 0.8, length: 31 },
    ],
  },
  5: {
    crownW: 29,
    neckW: 21,
    crownH: 29,
    cusps: 2,
    roots: [{ from: 0.08, to: 0.92, apexX: 0.5, length: 33 }],
  },
  6: {
    crownW: 38,
    neckW: 31,
    crownH: 28,
    cusps: 3,
    roots: [
      { from: 0.0, to: 0.36, apexX: -0.08, length: 30 },
      { from: 0.34, to: 0.66, apexX: 0.5, length: 34 },
      { from: 0.64, to: 1.0, apexX: 1.06, length: 30 },
    ],
  },
  7: {
    crownW: 36,
    neckW: 29,
    crownH: 27,
    cusps: 3,
    roots: [
      { from: 0.0, to: 0.37, apexX: 0.0, length: 28 },
      { from: 0.34, to: 0.66, apexX: 0.5, length: 31 },
      { from: 0.63, to: 1.0, apexX: 1.0, length: 28 },
    ],
  },
  8: {
    crownW: 33,
    neckW: 26,
    crownH: 25,
    cusps: 3,
    roots: [
      { from: 0.0, to: 0.4, apexX: 0.14, length: 22 },
      { from: 0.36, to: 0.64, apexX: 0.5, length: 24 },
      { from: 0.6, to: 1.0, apexX: 0.86, length: 22 },
    ],
  },
};

const LOWER: Record<number, ToothSpec> = {
  1: {
    crownW: 22,
    neckW: 16,
    crownH: 31,
    cusps: 0,
    roots: [{ from: 0.1, to: 0.9, apexX: 0.5, length: 34 }],
  },
  2: {
    crownW: 23,
    neckW: 17,
    crownH: 31,
    cusps: 0,
    roots: [{ from: 0.1, to: 0.9, apexX: 0.48, length: 35 }],
  },
  3: {
    crownW: 27,
    neckW: 20,
    crownH: 33,
    cusps: 1,
    roots: [{ from: 0.08, to: 0.92, apexX: 0.46, length: 40 }],
  },
  4: {
    crownW: 28,
    neckW: 21,
    crownH: 29,
    cusps: 2,
    roots: [{ from: 0.08, to: 0.92, apexX: 0.48, length: 36 }],
  },
  5: {
    crownW: 29,
    neckW: 21,
    crownH: 29,
    cusps: 2,
    roots: [{ from: 0.08, to: 0.92, apexX: 0.48, length: 36 }],
  },
  6: {
    crownW: 38,
    neckW: 31,
    crownH: 27,
    cusps: 3,
    roots: [
      { from: 0.0, to: 0.44, apexX: 0.02, length: 33 },
      { from: 0.56, to: 1.0, apexX: 0.98, length: 33 },
    ],
  },
  7: {
    crownW: 36,
    neckW: 29,
    crownH: 26,
    cusps: 3,
    roots: [
      { from: 0.0, to: 0.45, apexX: 0.12, length: 31 },
      { from: 0.55, to: 1.0, apexX: 0.88, length: 31 },
    ],
  },
  8: {
    crownW: 34,
    neckW: 27,
    crownH: 25,
    cusps: 3,
    roots: [
      { from: 0.0, to: 0.46, apexX: 0.28, length: 25 },
      { from: 0.54, to: 1.0, apexX: 0.74, length: 25 },
    ],
  },
};

export interface Point {
  x: number;
  y: number;
}

export interface ToothGeometry {
  upper: boolean;
  /** True for 2x/3x: drawn mirrored so mesial faces the midline. */
  mirrored: boolean;
  back: boolean;
  cx: number;
  /** Where crown meets root. */
  neckY: number;
  /** Bottom of the crown (biting edge). */
  edgeY: number;
  crownW: number;
  crown: string;
  roots: string[];
  /** Darker inner band of every root. */
  canals: string[];
  /** Centre line of every root canal, for root canal lines and posts. */
  canalLines: string[];
  /** Crown cut flat (worn). */
  worn: string;
  /** Crown with a broken corner (fractured). */
  fractured: string;
  /** Prepared stump under a crown (filed). */
  filed: string;
  /** Build-up core on a post. */
  core: string;
  /** Tapered telescopic coping. */
  telescopic: string;
  /** Root stump left after the crown is gone (radix). */
  radixCap: string;
  /** Centre of each surface spot. */
  surface: Record<"M" | "D" | "O" | "B", Point>;
  /** Spot drawn when no surface was picked. */
  defaultSurface: "M" | "O";
}

const r = (value: number) => Math.round(value * 100) / 100;

// Incisors widen towards the biting edge, canines are widest in the middle,
// back teeth bulge just below the neck.
function crownPath(cx: number, neckY: number, spec: ToothSpec) {
  const { crownW, neckW, crownH, cusps } = spec;
  const edge = neckY + crownH;
  const half = crownW / 2;
  const neck = neckW / 2;
  const left = cx - half;
  const right = cx + half;
  const bulge = cusps === 0 ? 0.68 : cusps === 1 ? 0.5 : 0.4;
  const bulgeY = neckY + crownH * bulge;
  const corner = cusps === 0 ? 2.2 : 1.5;
  let path = `M${r(cx - neck)} ${r(neckY)}`;
  path += ` C${r(cx - neck - 0.8)} ${r(neckY + crownH * bulge * 0.4)} ${r(left)} ${r(neckY + crownH * bulge * 0.55)} ${r(left)} ${r(bulgeY)}`;
  path += ` C${r(left)} ${r(edge - crownH * 0.12)} ${r(left + corner * 0.3)} ${r(edge)} ${r(left + crownW * 0.12 + corner)} ${r(edge)}`;
  const start = left + crownW * 0.12 + corner;
  const end = right - crownW * 0.12 - corner;
  if (cusps === 0) {
    path += ` Q${r(cx)} ${r(edge + 1.2)} ${r(end)} ${r(edge)}`;
  } else if (cusps === 1) {
    path += ` Q${r((start + cx) / 2)} ${r(edge + 1.4)} ${r(cx)} ${r(edge + 3.2)} Q${r((cx + end) / 2)} ${r(edge + 1.4)} ${r(end)} ${r(edge)}`;
  } else {
    const step = (end - start) / cusps;
    for (let index = 0; index < cusps; index++) {
      const x0 = start + step * index;
      const x1 = x0 + step;
      path += ` Q${r(x0 + step / 2)} ${r(edge + 2.4)} ${r(x1)} ${r(edge)}`;
    }
  }
  path += ` C${r(right - corner * 0.3)} ${r(edge)} ${r(right)} ${r(edge - crownH * 0.12)} ${r(right)} ${r(bulgeY)}`;
  path += ` C${r(right)} ${r(neckY + crownH * bulge * 0.55)} ${r(cx + neck + 0.8)} ${r(neckY + crownH * bulge * 0.4)} ${r(cx + neck)} ${r(neckY)}`;
  // The enamel border curves up towards the root between the two sides.
  path += ` Q${r(cx)} ${r(neckY - 2.6)} ${r(cx - neck)} ${r(neckY)} Z`;
  return path;
}

// A root tapers from its span at the neck to a narrow rounded apex. Its two
// sides bend towards the apex so multi-rooted teeth spread like real roots.
function rootPath(cx: number, neckY: number, spec: ToothSpec, root: ToothSpec["roots"][number]) {
  const neckLeft = cx - spec.neckW / 2;
  const x0 = neckLeft + spec.neckW * root.from;
  const x1 = neckLeft + spec.neckW * root.to;
  const span = x1 - x0;
  const ax = neckLeft + spec.neckW * root.apexX;
  const top = neckY - root.length;
  const tip = Math.max(1, span * 0.2);
  const L = root.length;
  return (
    `M${r(x0)} ${r(neckY + 0.5)}` +
    ` C${r(x0 - span * 0.04)} ${r(neckY - L * 0.32)} ${r(ax - tip - span * 0.12)} ${r(top + L * 0.38)} ${r(ax - tip)} ${r(top + 1.4)}` +
    ` Q${r(ax)} ${r(top - 1)} ${r(ax + tip)} ${r(top + 1.4)}` +
    ` C${r(ax + tip + span * 0.12)} ${r(top + L * 0.38)} ${r(x1 + span * 0.04)} ${r(neckY - L * 0.32)} ${r(x1)} ${r(neckY + 0.5)} Z`
  );
}

// The pulp canal: a thin band down the middle of the root, narrowing to the apex.
function canalPath(cx: number, neckY: number, spec: ToothSpec, root: ToothSpec["roots"][number]) {
  const neckLeft = cx - spec.neckW / 2;
  const mid = neckLeft + spec.neckW * ((root.from + root.to) / 2);
  const half = Math.max(1, spec.neckW * (root.to - root.from) * 0.17);
  const ax = neckLeft + spec.neckW * root.apexX;
  const top = neckY - root.length + 2.2;
  const L = root.length;
  const bend = (mid + ax) / 2;
  return (
    `M${r(mid - half)} ${r(neckY + 0.5)}` +
    ` C${r(mid - half)} ${r(neckY - L * 0.35)} ${r(bend - half * 0.45)} ${r(top + L * 0.25)} ${r(ax - 0.35)} ${r(top)}` +
    ` L${r(ax + 0.35)} ${r(top)}` +
    ` C${r(bend + half * 0.45)} ${r(top + L * 0.25)} ${r(mid + half)} ${r(neckY - L * 0.35)} ${r(mid + half)} ${r(neckY + 0.5)} Z`
  );
}

function canalLine(cx: number, neckY: number, spec: ToothSpec, root: ToothSpec["roots"][number]) {
  const neckLeft = cx - spec.neckW / 2;
  const mid = neckLeft + spec.neckW * ((root.from + root.to) / 2);
  const ax = neckLeft + spec.neckW * root.apexX;
  const top = neckY - root.length + 2.2;
  const L = root.length;
  return `M${r(cx)} ${r(neckY + 4)} L${r(mid)} ${r(neckY)} C${r(mid)} ${r(neckY - L * 0.35)} ${r((mid + ax) / 2)} ${r(top + L * 0.25)} ${r(ax)} ${r(top)}`;
}

const cache = new Map<number, ToothGeometry>();

export function toothGeometry(toothId: number): ToothGeometry {
  const cached = cache.get(toothId);
  if (cached) return cached;
  const quadrant = Math.floor(toothId / 10);
  const position = toothId % 10;
  const upper = quadrant === 1 || quadrant === 2;
  const spec = (upper ? UPPER : LOWER)[position] ?? UPPER[1];
  const cx = VIEW_W / 2;
  const neckY = VIEW_H - 3 - spec.crownH;
  const edgeY = neckY + spec.crownH;
  const half = spec.crownW / 2;
  const crownHalfH = spec.crownH;

  const wornY = neckY + crownHalfH * 0.55;
  // The mesial-occlusal corner is broken off along a straight diagonal.
  const fracture = `M${r(cx - spec.neckW / 2)} ${r(neckY)} C${r(cx - half - 0.8)} ${r(neckY + crownHalfH * 0.22)} ${r(cx - half)} ${r(neckY + crownHalfH * 0.3)} ${r(cx - half)} ${r(neckY + crownHalfH * 0.5)} L${r(cx - half)} ${r(edgeY - 3)} Q${r(cx - half)} ${r(edgeY)} ${r(cx - half + 3)} ${r(edgeY)} L${r(cx - half * 0.15)} ${r(edgeY)} L${r(cx + half)} ${r(neckY + crownHalfH * 0.38)} C${r(cx + half)} ${r(neckY + crownHalfH * 0.2)} ${r(cx + spec.neckW / 2 + 0.8)} ${r(neckY + crownHalfH * 0.1)} ${r(cx + spec.neckW / 2)} ${r(neckY)} Q${r(cx)} ${r(neckY - 2.6)} ${r(cx - spec.neckW / 2)} ${r(neckY)} Z`;
  const stumpW = spec.neckW * 0.72;
  const stumpH = crownHalfH * 0.62;
  const filed = `M${r(cx - spec.neckW / 2)} ${r(neckY)} L${r(cx - stumpW / 2)} ${r(neckY + stumpH)} Q${r(cx)} ${r(neckY + stumpH + 2)} ${r(cx + stumpW / 2)} ${r(neckY + stumpH)} L${r(cx + spec.neckW / 2)} ${r(neckY)} Z`;
  const coreW = spec.neckW * 0.66;
  const core = `M${r(cx - spec.neckW / 2)} ${r(neckY)} L${r(cx - coreW / 2)} ${r(neckY + stumpH)} L${r(cx + coreW / 2)} ${r(neckY + stumpH)} L${r(cx + spec.neckW / 2)} ${r(neckY)} Z`;
  const teleW = spec.neckW * 0.5;
  const telescopic = `M${r(cx - spec.neckW / 2)} ${r(neckY)} L${r(cx - teleW / 2)} ${r(neckY + stumpH + 2)} Q${r(cx)} ${r(neckY + stumpH + 4)} ${r(cx + teleW / 2)} ${r(neckY + stumpH + 2)} L${r(cx + spec.neckW / 2)} ${r(neckY)} Z`;
  const radixCap = `M${r(cx - spec.neckW / 2)} ${r(neckY + 0.5)} Q${r(cx)} ${r(neckY - 2.2)} ${r(cx + spec.neckW / 2)} ${r(neckY + 0.5)}`;

  const geometry: ToothGeometry = {
    upper,
    mirrored: quadrant === 2 || quadrant === 3,
    back: position >= 4,
    cx,
    neckY,
    edgeY,
    crownW: spec.crownW,
    crown: crownPath(cx, neckY, spec),
    roots: spec.roots.map((root) => rootPath(cx, neckY, spec, root)),
    canals: spec.roots.map((root) => canalPath(cx, neckY, spec, root)),
    canalLines: spec.roots.map((root) => canalLine(cx, neckY, spec, root)),
    worn: `${crownPath(cx, neckY, { ...spec, crownH: wornY - neckY, cusps: 0 })}`,
    fractured: fracture,
    filed,
    core,
    telescopic,
    radixCap,
    surface: {
      M: { x: r(cx + half - 3.4), y: r(neckY + crownHalfH * 0.52) },
      D: { x: r(cx - half + 3.4), y: r(neckY + crownHalfH * 0.52) },
      O: { x: r(cx), y: r(edgeY - 3.6) },
      B: { x: r(cx), y: r(neckY + crownHalfH * 0.5) },
    },
    defaultSurface: position >= 4 ? "O" : "M",
  };
  cache.set(toothId, geometry);
  return geometry;
}
