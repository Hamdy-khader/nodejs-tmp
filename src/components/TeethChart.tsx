import { useId } from "react";
import { UPPER_TEETH, LOWER_TEETH, type ToothState, type ToothStatus } from "@/lib/patients-store";
import { DENTAL_MARKS, getDentalVisual, type DentalVisual } from "@/lib/dental-visuals";
import { DentalMarkPath, DentalSymbol } from "./DentalSymbol";
import { cn } from "@/lib/utils";

interface Props {
  report?: boolean;
  showLegend?: boolean;
  teeth: Record<number, ToothState>;
  selected?: number | null;
  onSelect?: (n: number) => void;
  highlighted?: number[];
  annotations?: Record<number, ToothAnnotation[]>;
  baseTeeth?: Record<number, ToothState>;
}

export interface ToothAnnotation {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  background: string;
  border: string;
  visual?: DentalVisual;
}

type Cat = "molar" | "premolar" | "canine" | "incisor";

function categoryOf(n: number): Cat {
  const t = n % 10;
  if (t >= 6) return "molar";
  if (t >= 4) return "premolar";
  if (t === 3) return "canine";
  return "incisor";
}

// ─── Anatomy constants ──────────────────────────────────────────────────────
// viewBox 0 0 40 80
// Crown: y 7–32 | Roots: y 29–78. Upper teeth are mirrored vertically.
const SHAPES: Record<Cat, { crown: string; roots: string[] }> = {
  incisor: {
    crown: "M11 30 C10 25 10 16 12 11 Q20 7 28 11 C30 16 30 25 29 30 Q20 33 11 30 Z",
    roots: ["M12 30 C14 45 15 68 18 76 Q20 80 22 75 C26 57 28 39 28 30 Z"],
  },
  canine: {
    crown: "M10 30 C10 23 11 16 15 12 L20 8 L26 12 C29 17 30 24 30 30 Q20 33 10 30 Z",
    roots: ["M12 30 C13 47 15 71 19 78 Q21 80 23 73 C26 54 28 38 28 30 Z"],
  },
  premolar: {
    crown:
      "M8 29 C6 22 7 12 12 9 Q17 7 20 10 Q25 7 29 10 C33 15 33 23 31 29 Q25 33 20 30 Q14 33 8 29 Z",
    roots: [
      "M9 29 C8 42 9 63 12 73 Q14 78 16 69 L20 46 L24 70 Q26 77 28 72 C32 55 32 39 31 29 Q20 34 9 29 Z",
    ],
  },
  molar: {
    crown:
      "M5 29 C3 22 4 12 8 9 Q13 6 19 10 Q26 6 31 9 C36 12 37 22 34 29 Q29 33 24 30 Q19 33 14 30 Q9 33 5 29 Z",
    roots: [
      "M6 29 C4 41 6 61 10 71 Q13 76 15 69 L18 48 Q20 42 22 49 L25 69 Q27 76 30 71 C35 56 36 40 34 29 Q20 34 6 29 Z",
    ],
  },
};

// ─── Tooth SVG ──────────────────────────────────────────────────────────────
function ToothSVG({
  number,
  status,
  note,
  bridgePosition,
  pontic = false,
  visual: suppliedVisual,
  visuals: suppliedVisuals,
  baseStatus,
  active = false,
}: {
  number: number;
  status: ToothStatus;
  note?: string;
  pontic?: boolean;
  visual?: DentalVisual;
  visuals?: DentalVisual[];
  baseStatus?: ToothStatus;
  active?: boolean;
  bridgePosition?: "single" | "left" | "middle" | "right";
}) {
  const shape = SHAPES[categoryOf(number)];
  const id = `tk${number}-${useId().replace(/:/g, "")}`;
  const visual = suppliedVisual ?? getDentalVisual(note ?? "", { status });
  const visuals = suppliedVisuals?.length ? suppliedVisuals : [visual];
  const marks = visuals.map((layer) => layer.mark);
  const layerColor = (layer: DentalVisual) =>
    layer.treatment && visuals.length === 1 ? "#66b96a" : layer.color;
  const { mark } = visual;
  const color = visual.treatment ? "#66b96a" : visual.color;
  const background = visual.treatment ? "#eef8ee" : visual.background;
  const transform = number < 30 ? "translate(0,80) scale(1,-1)" : undefined;
  const implantVisual = visuals.find((layer) =>
    ["implant", "abutment", "screw"].includes(layer.mark),
  );
  const implant = baseStatus === "implant" || status === "implant" || !!implantVisual;
  const missing =
    !implant &&
    !pontic &&
    (status === "missing" ||
      ["missing", "extraction", "surgical", "implantRemoval"].includes(mark));
  const bridgeVisual = visuals.find((layer) => layer.mark === "bridge");
  const bridge = !!bridgePosition;
  const rootTreatment = [
    "root",
    "rootOne",
    "rootTwo",
    "rootThree",
    "retreatment",
    "post",
    "pin",
    "necrosis",
  ].some((rootMark) => marks.includes(rootMark as typeof mark));
  const crown =
    mark === "fractured"
      ? "M8 37 L8 23 L14 27 L18 16 L23 25 L29 19 L32 37 Z"
      : mark === "worn" || mark === "bruxism"
        ? "M10 37 L10 22 Q20 19 30 22 L30 37 Z"
        : mark === "radix"
          ? "M10 37 L12 32 L19 35 L26 31 L30 37 Z"
          : shape.crown;
  const coloredCrown = ["discolored", "necrosis"].includes(mark);
  const restoration = [
    "crown",
    "bridge",
    "veneer",
    "composite",
    "amalgam",
    "inlay",
    "onlay",
    "temporary",
    "medicated",
  ].includes(mark);
  const barLeft = bridgePosition === "left" || bridgePosition === "single" ? 4 : -20;
  const barRight = bridgePosition === "right" || bridgePosition === "single" ? 36 : 60;
  return (
    <svg
      viewBox="0 0 40 80"
      className="h-full w-full"
      style={{ overflow: "visible" }}
      role="img"
      aria-label={visuals.map((layer) => layer.label).join(", ")}
    >
      <title>{visuals.map((layer) => layer.label).join(", ")}</title>
      <defs>
        <linearGradient id={id + "-enamel"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={coloredCrown ? background : "#ffffff"} />
          <stop offset="100%" stopColor={coloredCrown ? color : "#fdfefe"} />
        </linearGradient>
        <linearGradient id={id + "-root"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e5f2f8" />
          <stop offset="100%" stopColor={rootTreatment ? background : "#cce5f0"} />
        </linearGradient>
        <clipPath id={id + "-root-clip"}>
          <rect x="0" y="29" width="40" height={mark === "resorption" ? 30 : 51} />
        </clipPath>
      </defs>
      <g
        transform={transform}
        data-tooth-visual={note || status}
        data-visual-key={visual.key}
        data-pontic={pontic || undefined}
      >
        {bridge && (
          <path
            data-bridge-connector="true"
            d={`M${barLeft} 28 H${barRight}`}
            stroke={bridgeVisual ? layerColor(bridgeVisual) : color}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        )}
        {missing ? (
          <path
            d={shape.roots[0]}
            fill={background}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        ) : (
          <>
            {implant ? (
              <g
                data-dental-mark="implant"
                fill={implantVisual?.background ?? background}
                stroke={implantVisual ? layerColor(implantVisual) : color}
                strokeWidth="1.4"
              >
                <path d="M14 38 H26 L24 70 Q20 80 16 70 Z" />
                {[42, 48, 54, 60, 66].map((y) => (
                  <path key={y} d={`M14 ${y} H26`} />
                ))}
              </g>
            ) : (
              <g clipPath={"url(#" + id + "-root-clip)"}>
                {!pontic &&
                  shape.roots.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill={`url(#${id}-root)`}
                      stroke={rootTreatment ? color : "#818b91"}
                      strokeWidth="0.85"
                    />
                  ))}
              </g>
            )}
            {(!implant ||
              marks.some((m) =>
                [
                  "crown",
                  "bridge",
                  "veneer",
                  "composite",
                  "inlay",
                  "onlay",
                  "temporary",
                  "medicated",
                  "amalgam",
                ].includes(m),
              )) && (
              <path
                d={crown}
                fill={`url(#${id}-enamel)`}
                stroke={active || (visual.treatment && restoration) ? "#66b96a" : "#818b91"}
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
        {visuals.map((layer, index) => {
          const { mark } = layer;
          const color = layerColor(layer);
          const background = layer.treatment && visuals.length === 1 ? "#eef8ee" : layer.background;
          return (
            <g key={layer.key} data-procedure-visual={layer.key}>
              {["crown", "bridge", "veneer"].includes(mark) ? (
                <path
                  data-dental-mark={mark}
                  d={
                    layer.treatment || mark === "crown"
                      ? crown
                      : mark === "veneer"
                        ? DENTAL_MARKS.veneer
                        : `${crown} M2 28 H38 M4 23 V33 M36 23 V33`
                  }
                  fill={mark === "veneer" || visuals.length > 1 ? "none" : background}
                  stroke={color}
                  strokeWidth={layer.treatment ? "1.2" : "1.6"}
                  transform={`translate(20,21) scale(${Math.max(0.52, 0.82 - index * 0.06)},.78) translate(-20,-21)`}
                />
              ) : ["composite", "amalgam", "inlay", "onlay", "temporary", "medicated"].includes(
                  mark,
                ) ? (
                <path
                  data-dental-mark={mark}
                  d={
                    !layer.treatment
                      ? DENTAL_MARKS[mark]
                      : mark === "inlay"
                        ? "M20 13 L26 20 L20 27 L14 20 Z"
                        : mark === "onlay"
                          ? "M11 13 Q20 8 29 13 L27 22 H13 Z"
                          : "M14 16 Q20 13 26 16 L26 25 Q20 28 14 25 Z"
                  }
                  fill={visuals.length > 1 ? "none" : mark === "amalgam" ? "#a4aab0" : background}
                  stroke={color}
                  strokeWidth={layer.treatment ? "1.2" : "1.6"}
                  strokeDasharray={mark === "temporary" ? "2 1" : undefined}
                />
              ) : mark !== "intact" && mark !== "implant" ? (
                <DentalMarkPath visual={{ ...layer, color }} />
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function ToothIllustration({
  number,
  status,
  note,
  className,
}: {
  number: number;
  status: ToothStatus;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("aspect-[1/2] w-full max-w-[44px]", className)}>
      <ToothSVG number={number} status={status} note={note} />
    </div>
  );
}

// ─── Bridge run detection ────────────────────────────────────────────────────
function bridgeRuns(
  numbers: number[],
  teeth: Record<number, ToothState>,
  annotations?: Record<number, ToothAnnotation[]>,
  baseTeeth?: Record<number, ToothState>,
) {
  const isBridge = (number: number) =>
    annotations?.[number]?.some((annotation) => annotation.visual?.mark === "bridge") ||
    (teeth[number]?.status === "bridge" && toothVisual(teeth[number]).mark === "bridge") ||
    (baseTeeth?.[number]?.status === "bridge" && toothVisual(baseTeeth[number]).mark === "bridge");
  const runs: { start: number; end: number }[] = [];
  let i = 0;
  while (i < numbers.length) {
    if (isBridge(numbers[i])) {
      const start = i;
      i++;
      while (i < numbers.length) {
        if (isBridge(numbers[i])) {
          i++;
          continue;
        }
        if (teeth[numbers[i]]?.status !== "missing") break;
        let next = i;
        while (next < numbers.length && teeth[numbers[next]]?.status === "missing") next++;
        if (next >= numbers.length || !isBridge(numbers[next])) break;
        i = next + 1;
      }
      runs.push({ start, end: i - 1 });
    } else {
      i++;
    }
  }
  return runs;
}

function toothVisual(tooth: ToothState | undefined, annotations: ToothAnnotation[] = []) {
  return (
    annotations.at(-1)?.visual ??
    getDentalVisual(tooth?.note ?? "", { status: tooth?.status ?? "intact" })
  );
}

function Row({
  numbers,
  isUpper,
  teeth,
  selected,
  onSelect,
  highlighted,
  annotations,
  baseTeeth,
  report,
}: { numbers: number[]; isUpper: boolean } & Props) {
  const runs = bridgeRuns(numbers, teeth, annotations, baseTeeth);
  const runLookup = new Map<number, "single" | "left" | "middle" | "right">();
  for (const run of runs) {
    for (let k = run.start; k <= run.end; k++) {
      runLookup.set(
        k,
        run.start === run.end
          ? "single"
          : k === run.start
            ? "left"
            : k === run.end
              ? "right"
              : "middle",
      );
    }
  }
  return (
    <div dir="ltr" className="relative flex w-full items-end justify-center gap-0.5 sm:gap-1">
      {numbers.map((number, index) => {
        const tooth = teeth[number];
        const status = tooth?.status ?? "intact";
        const selectedTooth = selected === number;
        const highlightedTooth = highlighted?.includes(number);
        const notes = annotations?.[number] ?? [];
        const visual = toothVisual(tooth, notes);
        const layers = notes.flatMap((annotation) =>
          annotation.visual ? [annotation.visual] : [],
        );
        const base = baseTeeth?.[number];
        // An existing implant/root treatment remains underneath a new restoration.
        if (layers.length && base && ["implant", "root-treated"].includes(base.status)) {
          const baseVisual = toothVisual(base);
          if (!layers.some((layer) => layer.mark === baseVisual.mark)) layers.unshift(baseVisual);
        }
        const bridgePosition = runLookup.get(index);
        const hasImplant =
          base?.status === "implant" ||
          layers.some((layer) => ["implant", "abutment", "screw"].includes(layer.mark));
        const pontic = status === "missing" && !!bridgePosition && !hasImplant;
        const drawnVisual = pontic ? getDentalVisual("Bridge") : visual;
        const labels = notes.length
          ? layers.map((layer) => layer.label)
          : [visual.label, ...(tooth?.diagnosis ?? [])];
        const accessibleLabel = `Tooth ${number}: ${labels.join(", ")}`;
        return (
          <button
            key={number}
            type="button"
            data-tooth-number={number}
            aria-label={accessibleLabel}
            title={accessibleLabel}
            aria-pressed={selectedTooth || !!highlightedTooth}
            onClick={() => onSelect?.(number)}
            className={cn(
              "group relative flex min-w-0 flex-1 flex-col items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
              isUpper ? "flex-col" : "flex-col-reverse",
            )}
          >
            <div className="relative aspect-[1/2] w-full max-w-[34px]">
              <ToothSVG
                number={number}
                active={selectedTooth || !!highlightedTooth}
                status={bridgePosition ? "bridge" : status}
                note={pontic ? undefined : tooth?.note}
                visual={drawnVisual}
                visuals={layers}
                baseStatus={base?.status}
                pontic={pontic}
                bridgePosition={bridgePosition}
              />
            </div>
            <span
              className={cn(
                "my-1 grid h-[19px] w-[19px] place-items-center rounded-full border text-[9px] tabular-nums leading-none",
                selectedTooth || highlightedTooth
                  ? "border-[#66b96a] text-[#66b96a]"
                  : "border-transparent text-[#929ba4]",
              )}
            >
              {number}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TeethChart({
  teeth,
  selected,
  onSelect,
  highlighted,
  annotations,
  baseTeeth,
  report,
  showLegend = false,
}: Props) {
  const legend = new Map<string, { visual: DentalVisual; numbers: number[] }>();
  for (const number of [...UPPER_TEETH, ...LOWER_TEETH]) {
    const notes = annotations?.[number] ?? [];
    const visuals = notes.length
      ? notes.flatMap((note) => (note.visual ? [note.visual] : []))
      : [toothVisual(teeth[number])];
    for (const visual of visuals) {
      if (visual.mark === "intact") continue;
      const entry = legend.get(visual.key) ?? { visual, numbers: [] };
      entry.numbers.push(number);
      legend.set(visual.key, entry);
    }
  }
  const shared = { teeth, selected, onSelect, highlighted, annotations, baseTeeth, report };
  return (
    <div className={report ? "space-y-1 py-2" : "space-y-1 bg-white px-1 py-2"}>
      <Row numbers={UPPER_TEETH} isUpper {...shared} />
      <div className="h-px bg-border" />
      <Row numbers={LOWER_TEETH} isUpper={false} {...shared} />

      {!report && showLegend && legend.size > 0 && (
        <div className="border-t border-border/60 pt-3" aria-label="Tooth symbols and colors">
          <p className="mb-2 text-[10px] font-semibold text-muted-foreground">Symbols & colors</p>
          <div className="flex flex-wrap gap-2">
            {[...legend.values()].map(({ visual, numbers }) => (
              <div
                key={visual.key}
                className="flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px]"
                style={{
                  color: visual.color,
                  background: visual.background,
                  borderColor: visual.border,
                }}
                title={`${visual.label} — Teeth ${numbers.join(", ")}`}
              >
                <DentalSymbol visual={visual} className="h-5 w-5 shrink-0" />
                <span className="min-w-0 break-words">
                  <strong>{visual.label}</strong>
                  <span className="ml-1 opacity-75">{numbers.join(", ")}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
