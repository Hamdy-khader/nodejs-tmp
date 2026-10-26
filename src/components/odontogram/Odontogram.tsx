import { useMemo, useRef, useState } from "react";
import type { StatusEntry } from "@/lib/dental/diagnosis-engine";
import {
  bridgeConnectors,
  buildMouthVisuals,
  dentureRuns,
  type PlannedState,
  type ToothVisual,
} from "@/lib/dental/tooth-visual";
import { cn } from "@/lib/utils";
import { VIEW_H, toothGeometry } from "./tooth-geometry";
import { ODONTOGRAM_COLORS, ToothGraphic } from "./ToothGraphic";

export const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export type OdontogramMode = "diagnosis" | "treatments";

interface Props {
  entries: StatusEntry[];
  planned?: PlannedState[];
  mode?: OdontogramMode;
  selected?: number[];
  /** Click toggles a tooth; dragging across teeth selects all of them. */
  onSelectionChange?: (teeth: number[]) => void;
  readOnly?: boolean;
  className?: string;
}

const C = ODONTOGRAM_COLORS;

// Height of a horizontal line through the tooth, as a share of the tooth box,
// for the upper (crown at the bottom) or lower (crown at the top) jaw.
function crownLevel(tooth: number, upper: boolean) {
  const g = toothGeometry(tooth);
  const share = (g.neckY + g.edgeY) / 2 / VIEW_H;
  return `${(upper ? share : 1 - share) * 100}%`;
}

// The denture gum runs at one height across the row, just above the crowns.
function gumLevel(upper: boolean) {
  return upper ? "57%" : "43%";
}

// Two thin parallel lines from this tooth's centre to the next one; the
// crowns are drawn over them so only the gap between the units shows.
function Connector({
  tooth,
  planned,
  temporary,
  upper,
}: {
  tooth: number;
  planned: boolean;
  temporary: boolean;
  upper: boolean;
}) {
  const color = temporary ? "#D9B58A" : planned ? C.plannedLine : C.outline;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 h-[6px] w-full -translate-y-1/2"
      style={{ top: crownLevel(tooth, upper) }}
      viewBox="0 0 20 6"
      preserveAspectRatio="none"
      data-bridge-connector="true"
    >
      <path
        d="M0 1.6 H20 M0 4.4 H20"
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// The pink gum of a denture, continuous across neighbouring denture teeth.
function DentureBase({
  upper,
  first,
  last,
  planned,
}: {
  upper: boolean;
  first: boolean;
  last: boolean;
  planned: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -translate-y-1/2 border-y",
        first ? "left-[8%] rounded-l-full border-l" : "-left-px",
        last ? "right-[8%] rounded-r-full border-r" : "-right-px",
      )}
      style={{
        top: gumLevel(upper),
        height: "9%",
        background: C.gum,
        borderColor: planned ? C.plannedLine : C.gumLine,
      }}
      data-denture-base="true"
    />
  );
}

function DriftArrow({ visual, upper }: { visual: ToothVisual; upper: boolean }) {
  // Front means towards the midline: right in the right half of the chart.
  const rightHalf = Math.floor(visual.toothId / 10) === 1 || Math.floor(visual.toothId / 10) === 4;
  const towardsRight = visual.drift === "front" ? rightHalf : !rightHalf;
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute h-3 w-full",
        towardsRight ? "-right-1/2" : "-left-1/2",
      )}
      style={{ top: upper ? "62%" : "30%" }}
      viewBox="0 0 24 6"
      preserveAspectRatio="none"
      data-drift={visual.drift}
    >
      <path
        d="M3 3 H21 M3 3 L6.5 0.8 M3 3 L6.5 5.2 M21 3 L17.5 0.8 M21 3 L17.5 5.2"
        stroke="#555"
        strokeWidth={1.4}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Row({
  teeth,
  upper,
  visuals,
  links,
  selected,
  mode,
  onToggle,
}: {
  teeth: number[];
  upper: boolean;
  visuals: Record<number, ToothVisual>;
  links: ReturnType<typeof bridgeConnectors>;
  selected: number[];
  mode: OdontogramMode;
  /** Without it the teeth are drawn as a picture, not buttons (reports, PDF). */
  onToggle?: (tooth: number) => void;
}) {
  const runs = dentureRuns(teeth, visuals);
  const Cell = onToggle ? "button" : "div";
  return (
    <div dir="ltr" className="flex w-full items-stretch">
      {teeth.map((tooth, index) => {
        const visual = visuals[tooth];
        const isSelected = selected.includes(tooth);
        const linkRight = links.find((link) => link.from === tooth);
        const run = runs.find((candidate) => candidate.teeth.includes(tooth));
        const number = (
          <span
            className={cn(
              "mx-auto grid h-[19px] w-[19px] place-items-center rounded-full border text-[10px] tabular-nums leading-none text-[#8a8f94]",
              visual.marker === "planned"
                ? "border-[#5cb85c]"
                : visual.marker === "status"
                  ? "border-[#8a8f94]"
                  : "border-transparent",
            )}
            data-marker={visual.marker}
          >
            {tooth}
          </span>
        );
        return (
          <Cell
            key={tooth}
            data-tooth-number={tooth}
            {...(onToggle && {
              type: "button" as const,
              "aria-pressed": isSelected,
              "aria-label": `Tooth ${tooth}`,
              onClick: () => onToggle(tooth),
            })}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-[1px] py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
              index === 7 && "border-r border-[#d9dde1]",
            )}
          >
            {!upper && number}
            <span
              className={cn(
                "relative block aspect-[1/2] w-full max-w-[44px]",
                isSelected && (mode === "treatments" ? "bg-[#c5e7c3]" : "bg-[#d5d8db]"),
              )}
            >
              {run && (
                <DentureBase
                  upper={upper}
                  first={run.teeth[0] === tooth}
                  last={run.teeth.at(-1) === tooth}
                  planned={run.planned}
                />
              )}
              {linkRight && (
                <Connector
                  tooth={tooth}
                  planned={linkRight.planned}
                  temporary={linkRight.temporary}
                  upper={upper}
                />
              )}
              <span className="relative z-10 block h-full w-full">
                <ToothGraphic visual={visual} />
              </span>
              {visual.drift && <DriftArrow visual={visual} upper={upper} />}
            </span>
            {upper && number}
          </Cell>
        );
      })}
    </div>
  );
}

/**
 * The full-mouth chart used in both the diagnosis and the treatment steps.
 * Upper teeth sit above their numbers, lower teeth below; the vertical line is
 * the midline. Selection is a grey box in diagnosis and a green box in
 * treatment mode.
 */
export function Odontogram({
  entries,
  planned = [],
  mode = "diagnosis",
  selected = [],
  onSelectionChange,
  readOnly = false,
  className,
}: Props) {
  const visuals = useMemo(
    () => buildMouthVisuals(entries, mode === "treatments" ? planned : []),
    [entries, planned, mode],
  );
  const upperLinks = useMemo(() => bridgeConnectors(UPPER_ROW, visuals), [visuals]);
  const lowerLinks = useMemo(() => bridgeConnectors(LOWER_ROW, visuals), [visuals]);

  const drag = useRef<{ x: number; y: number; active: boolean; initial: number[] } | null>(null);
  const suppressClick = useRef(false);
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const interactive = !readOnly && !!onSelectionChange;
  const toggle = interactive
    ? (tooth: number) =>
        onSelectionChange(
          selected.includes(tooth) ? selected.filter((t) => t !== tooth) : [...selected, tooth],
        )
    : undefined;

  return (
    <div
      className={cn("relative select-none bg-white", className)}
      data-odontogram={mode}
      {...(!interactive && {
        role: "img",
        "aria-label": mode === "treatments" ? "Treatment chart" : "Dental chart",
      })}
      onPointerDown={(event) => {
        if (!interactive || event.button !== 0 || event.pointerType === "touch") return;
        suppressClick.current = false;
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          active: false,
          initial: [...selected],
        };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || !onSelectionChange || event.buttons !== 1) return;
        if (!start.active && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5)
          return;
        start.active = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const left = Math.min(start.x, event.clientX);
        const right = Math.max(start.x, event.clientX);
        const top = Math.min(start.y, event.clientY);
        const bottom = Math.max(start.y, event.clientY);
        const bounds = event.currentTarget.getBoundingClientRect();
        setBox({
          left: left - bounds.left,
          top: top - bounds.top,
          width: right - left,
          height: bottom - top,
        });
        const hit = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>("[data-tooth-number]"),
        )
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.right > left && r.left < right && r.bottom > top && r.top < bottom;
          })
          .map((el) => Number(el.dataset.toothNumber));
        onSelectionChange([...new Set([...start.initial, ...hit])]);
      }}
      onPointerUp={() => {
        suppressClick.current = !!drag.current?.active;
        drag.current = null;
        setBox(null);
      }}
      onPointerCancel={() => {
        if (drag.current?.active) onSelectionChange?.(drag.current.initial);
        drag.current = null;
        setBox(null);
      }}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <Row
        teeth={UPPER_ROW}
        upper
        visuals={visuals}
        links={upperLinks}
        selected={selected}
        mode={mode}
        onToggle={toggle}
      />
      <div className="mx-1 h-px bg-[#d9dde1]" />
      <Row
        teeth={LOWER_ROW}
        upper={false}
        visuals={visuals}
        links={lowerLinks}
        selected={selected}
        mode={mode}
        onToggle={toggle}
      />
      {box && (
        <div
          data-selection-box
          className="pointer-events-none absolute z-20 border border-primary bg-primary/15"
          style={box}
        />
      )}
    </div>
  );
}
