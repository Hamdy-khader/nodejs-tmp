import { ORIGINAL_TOOTH_NOTES, detailedDentalStyle } from "@/lib/detailed-dental-style";
import { DetailedTooth, toothShape } from "./DetailedTooth";
import { useRef, useState } from "react";
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
  onSelectMany?: (numbers: number[]) => void;
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
  baseNote,
}: {
  number: number;
  status: ToothStatus;
  note?: string;
  pontic?: boolean;
  visual?: DentalVisual;
  visuals?: DentalVisual[];
  baseStatus?: ToothStatus;
  baseNote?: string;
  bridgePosition?: "single" | "left" | "middle" | "right";
}) {
  const shape = toothShape(number);
  const visual = suppliedVisual ?? getDentalVisual(note ?? "", { status });
  const visuals = suppliedVisuals?.length ? suppliedVisuals : [visual];
  const layerColor = (layer: DentalVisual) => detailedDentalStyle(layer).color;
  const { mark } = visual;
  const transform = number < 30 ? "translate(0,80) scale(1,-1)" : undefined;
  const implantVisual = visuals.find((layer) =>
    ["implant", "abutment", "screw"].includes(layer.mark),
  );
  const implant = baseStatus === "implant" || status === "implant" || !!implantVisual;
  const missing =
    !implant &&
    !pontic &&
    (status === "missing" ||
      baseStatus === "missing" ||
      ["missing", "extraction", "surgical", "implantRemoval"].includes(mark));
  const bridgeVisual = visuals.find((layer) => layer.mark === "bridge");
  const bridge = !!bridgePosition;
  const crown =
    mark === "fractured"
      ? "M8 37 L8 23 L14 27 L18 16 L23 25 L29 19 L32 37 Z"
      : mark === "worn" || mark === "bruxism"
        ? "M10 37 L10 22 Q20 19 30 22 L30 37 Z"
        : mark === "radix"
          ? "M10 37 L12 32 L19 35 L26 31 L30 37 Z"
          : shape.crown;
  const detailedStatus: ToothStatus = implant
    ? "implant"
    : pontic
      ? "bridge"
      : missing
        ? "missing"
        : mark === "root"
          ? "root-treated"
          : mark === "crown"
            ? "crown"
            : mark === "bridge"
              ? "bridge"
              : mark === "caries"
                ? "caries"
                : ["composite", "amalgam", "inlay"].includes(mark)
                  ? "filled"
                  : status;
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
      <g
        transform={transform}
        data-tooth-visual={note || status}
        data-visual-key={visual.key}
        data-pontic={pontic || undefined}
      >
        <DetailedTooth
          number={number}
          status={detailedStatus}
          note={baseNote || ORIGINAL_TOOTH_NOTES[mark] || note}
          pontic={pontic}
        />
        <g>
          {implant && <g data-dental-mark="implant" />}
          {bridge && (
            <path
              data-bridge-connector="true"
              d={`M${barLeft} 37 H${barRight}`}
              stroke={bridgeVisual ? layerColor(bridgeVisual) : "#7C4AC9"}
              strokeWidth="2.8"
              opacity="0.75"
            />
          )}
          {visuals.map((layer, index) => {
            const { mark } = layer;
            const color = layerColor(layer);
            const background = detailedDentalStyle(layer).background;
            const classic = ORIGINAL_TOOTH_NOTES[mark] !== undefined;
            if (visuals.length === 1 && classic)
              return (
                <g key={layer.key} data-procedure-visual={layer.key} data-dental-mark={mark} />
              );
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
) {
  const isBridge = (number: number) =>
    annotations?.[number]?.some((annotation) => annotation.visual?.mark === "bridge") ||
    (teeth[number]?.status === "bridge" && toothVisual(teeth[number]).mark === "bridge");
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
  const runs = bridgeRuns(numbers, teeth, annotations);
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
        const replacesBaseDrawing = layers.some((layer) =>
          ["crown", "bridge", "veneer", "dentures", "implant", "abutment"].includes(layer.mark),
        );
        let baseNote: string | undefined;
        // A replacement uses the current treatment drawing. Keep supporting
        // implants/root treatments, but do not redraw the old prosthesis or X
        // from the diagnosis over it. The saved diagnosis remains unchanged.
        if (layers.length && base && (base.status !== "intact" || base.note)) {
          const baseVisual =
            replacesBaseDrawing && ["implant", "root-treated"].includes(base.status)
              ? getDentalVisual("", { status: base.status })
              : toothVisual(base);
          const keepBase =
            !replacesBaseDrawing ||
            ["implant", "abutment", "root", "post", "pin"].includes(baseVisual.mark);
          if (keepBase) {
            if (!layers.some((layer) => layer.mark === baseVisual.mark)) layers.unshift(baseVisual);
            baseNote = replacesBaseDrawing ? ORIGINAL_TOOTH_NOTES[baseVisual.mark] : base.note;
          }
        }
        const bridgePosition = runLookup.get(index);
        const hasImplant =
          base?.status === "implant" ||
          layers.some((layer) => ["implant", "abutment", "screw"].includes(layer.mark));
        // A later bridge overwrites the preview status, but cannot restore a
        // natural root lost in the diagnosis or an earlier extraction stage.
        const missingTooth = status === "missing" || base?.status === "missing" ||
          layers.some(layer => ["missing", "extraction", "surgical", "implantRemoval"].includes(layer.mark));
        const replacement =
          !!bridgePosition || ["crown", "bridge", "veneer", "dentures"].includes(visual.mark);
        const pontic = missingTooth && replacement && !hasImplant;
        const drawnVisual = pontic && bridgePosition ? getDentalVisual("Bridge") : visual;
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
            <div className="relative aspect-[1/2] w-full max-w-[44px]">
              <ToothSVG
                number={number}
                status={bridgePosition ? "bridge" : status}
                note={pontic ? undefined : tooth?.note}
                visual={drawnVisual}
                visuals={layers}
                baseStatus={base?.status}
                baseNote={baseNote}
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
  onSelectMany,
  highlighted,
  annotations,
  baseTeeth,
  report,
  showLegend = false,
}: Props) {
  const drag = useRef<{
    x: number;
    y: number;
    active: boolean;
    initial: number[];
    additive: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const legend = new Map<string, { visual: DentalVisual; numbers: number[] }>();
  for (const number of [...UPPER_TEETH, ...LOWER_TEETH]) {
    const notes = annotations?.[number] ?? [];
    const visuals = notes.length
      ? notes.flatMap((note) => (note.visual ? [note.visual] : []))
      : [toothVisual(teeth[number])];
    for (const visual of visuals) {
      if (visual.mark === "intact") continue;
      const entry = legend.get(visual.key) ?? { visual: detailedDentalStyle(visual), numbers: [] };
      entry.numbers.push(number);
      legend.set(visual.key, entry);
    }
  }
  const shared = { teeth, selected, onSelect, highlighted, annotations, baseTeeth, report };
  return (
    <div className={report ? "space-y-1 py-2" : "space-y-1 bg-white px-1 py-2"}>
      <div
        className="relative select-none space-y-1"
        data-diagnosis-selection
        data-treatment-selection
        onPointerDown={(event) => {
          if (report || !onSelectMany || event.button !== 0 || event.pointerType === "touch")
            return;
          suppressClick.current = false;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            active: false,
            initial: [...(highlighted ?? [])],
            additive: event.shiftKey || event.ctrlKey || event.metaKey,
          };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || !onSelectMany || event.buttons !== 1) return;
          if (!start.active && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5)
            return;
          start.active = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          const left = Math.min(start.x, event.clientX),
            right = Math.max(start.x, event.clientX);
          const top = Math.min(start.y, event.clientY),
            bottom = Math.max(start.y, event.clientY);
          const bounds = event.currentTarget.getBoundingClientRect();
          setSelectionBox({
            left: left - bounds.left,
            top: top - bounds.top,
            width: right - left,
            height: bottom - top,
          });
          const numbers = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>("[data-tooth-number]"),
          )
            .filter((tooth) => {
              const box = tooth.getBoundingClientRect();
              return box.right > left && box.left < right && box.bottom > top && box.top < bottom;
            })
            .map((tooth) => Number(tooth.dataset.toothNumber));
          onSelectMany(start.additive ? [...new Set([...start.initial, ...numbers])] : numbers);
        }}
        onPointerUp={() => {
          suppressClick.current = !!drag.current?.active;
          drag.current = null;
          setSelectionBox(null);
        }}
        onPointerCancel={() => {
          if (drag.current?.active) onSelectMany?.(drag.current.initial);
          drag.current = null;
          setSelectionBox(null);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <Row numbers={UPPER_TEETH} isUpper {...shared} />
        <div className="h-px bg-border" />
        <Row numbers={LOWER_TEETH} isUpper={false} {...shared} />
        {selectionBox && (
          <div
            data-selection-box
            className="pointer-events-none absolute z-20 border border-primary bg-primary/15"
            style={selectionBox}
          />
        )}
      </div>

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
