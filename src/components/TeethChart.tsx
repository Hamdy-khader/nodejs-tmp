import { UPPER_TEETH, LOWER_TEETH, STATUS_META, type ToothState, type ToothStatus } from "@/lib/patients-store";
import { cn } from "@/lib/utils";

interface Props {
  teeth: Record<number, ToothState>;
  selected?: number | null;
  onSelect?: (n: number) => void;
  highlighted?: number[];
}

type Cat = "molar" | "premolar" | "canine" | "incisor";

function categoryOf(n: number): Cat {
  const t = n % 10;
  if (t >= 6) return "molar";
  if (t >= 4) return "premolar";
  if (t === 3) return "canine";
  return "incisor";
}

// Bridge palette — medical green
const BRIDGE = {
  band: "oklch(0.86 0.13 150)",
  bandSoft: "oklch(0.92 0.08 150)",
  bar: "oklch(0.55 0.18 150)",
  outline: "oklch(0.45 0.18 150)",
  crownTint: "oklch(0.93 0.07 150)",
} as const;

// viewBox 0 0 40 80 — crown TOP (y 8–38), roots BELOW (y 38–78).
const SHAPES: Record<Cat, { crown: string; roots: string[] }> = {
  molar: {
    crown:
      "M5 38 C5 20 11 8 20 8 C29 8 35 20 35 38 L31 40 L26 38 L20 40 L14 38 L9 40 Z",
    roots: [
      "M9 40 C6 52 9 72 14 76 C16 77 17 72 16.5 62 L17 40 Z",
      "M31 40 C34 52 31 72 26 76 C24 77 23 72 23.5 62 L23 40 Z",
      "M18 40 L18.5 56 L21.5 56 L22 40 Z",
    ],
  },
  premolar: {
    crown:
      "M8 38 C8 22 13 11 20 11 C27 11 32 22 32 38 L26 40 L20 38 L14 40 Z",
    roots: [
      "M12 40 C10 54 12 72 15 76 C17 77 17 71 16.5 60 L17 40 Z",
      "M28 40 C30 54 28 72 25 76 C23 77 23 71 23.5 60 L23 40 Z",
    ],
  },
  canine: {
    crown:
      "M10 38 Q10 30 13 26 L19 8 Q20 6 21 8 L27 26 Q30 30 30 38 Z",
    roots: [
      "M13 38 C12 56 16 77 20 77 C24 77 28 56 27 38 Z",
    ],
  },
  incisor: {
    crown:
      "M11 38 L11 16 Q11 11 15 11 L25 11 Q29 11 29 16 L29 38 Z",
    roots: [
      "M14 38 C13 56 17 77 20 77 C23 77 27 56 26 38 Z",
    ],
  },
};

function ToothSVG({
  number,
  status,
  bridgePosition,
}: {
  number: number;
  status: ToothStatus;
  /** Where this tooth sits inside a bridge run, undefined when not bridged. */
  bridgePosition?: "single" | "left" | "middle" | "right";
}) {
  const cat = categoryOf(number);
  const isUpper = number < 30;
  const meta = STATUS_META[status];
  const shape = SHAPES[cat];

  const indicatorFill = "oklch(0.92 0.04 230)"; // soft blue
  const rootFill = "#ffffff";
  const stroke = "oklch(0.42 0.04 240)";
  const strokeW = 1.1;

  const crownFill = (() => {
    switch (status) {
      case "crown":
        return meta.color;
      case "bridge":
        return BRIDGE.crownTint;
      default:
        return rootFill;
    }
  })();

  if (status === "missing") {
    return (
      <svg viewBox="0 0 40 80" className="h-full w-full">
        <line x1="8" y1="14" x2="32" y2="66" stroke="oklch(0.55 0.02 0)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="14" x2="8" y2="66" stroke="oklch(0.55 0.02 0)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === "implant") {
    return (
      <svg viewBox="0 0 40 80" className="h-full w-full" style={isUpper ? undefined : { transform: "rotate(180deg)" }}>
        <rect x="14" y="8" width="12" height="14" rx="2" fill={meta.color} stroke={meta.ring} strokeWidth="1.4" />
        <path d="M11 22 L29 22 L26 70 Q23 76 20 76 Q17 76 14 70 Z" fill={meta.color} stroke={meta.ring} strokeWidth="1.4" />
        {[28, 34, 40, 46, 52, 58, 64].map((y) => (
          <line key={y} x1="14" y1={y} x2="26" y2={y} stroke={meta.ring} strokeWidth="0.7" />
        ))}
      </svg>
    );
  }

  // Bridge connector geometry (extends past the viewBox to bridge the row gap)
  const isBridge = status === "bridge" && bridgePosition !== undefined;
  const barLeft = bridgePosition === "left" || bridgePosition === "single" ? 4 : -4;
  const barRight = bridgePosition === "right" || bridgePosition === "single" ? 36 : 44;

  return (
    <svg
      viewBox="0 0 40 80"
      className="h-full w-full"
      style={{
        overflow: "visible",
        ...(isUpper ? null : { transform: "rotate(180deg)" }),
      }}
    >
      {/* Bridge connector bar at the gum line (drawn first so crown sits on top). */}
      {isBridge && (
        <>
          <rect
            x={barLeft}
            y={34}
            width={barRight - barLeft}
            height={9}
            rx={2}
            fill={BRIDGE.band}
            opacity={0.55}
          />
          <line
            x1={barLeft}
            y1={38.5}
            x2={barRight}
            y2={38.5}
            stroke={BRIDGE.bar}
            strokeWidth={2.4}
            strokeLinecap={bridgePosition === "middle" ? "butt" : "round"}
          />
        </>
      )}

      {/* roots */}
      {shape.roots.map((d, i) => (
        <path key={i} d={d} fill={rootFill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
      ))}
      {/* crown */}
      <path d={shape.crown} fill={crownFill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
      {/* light blue indicator */}
      {status !== "crown" && status !== "bridge" && (
        <path
          d={shape.crown}
          fill={indicatorFill}
          style={{ clipPath: "inset(0 0 35% 0)" }}
        />
      )}

      {status === "caries" && (
        <circle cx="20" cy={cat === "molar" ? 22 : 20} r="3.6" fill="oklch(0.55 0.18 40)" stroke="oklch(0.35 0.1 30)" strokeWidth="0.8" />
      )}
      {status === "filled" && (
        <rect x="15" y={cat === "molar" ? 20 : 18} width="10" height="6" rx="1" fill="oklch(0.45 0.02 250)" />
      )}
      {status === "crown" && (
        <path d={shape.crown} fill="none" stroke="oklch(0.45 0.13 80)" strokeWidth="1.8" strokeDasharray="2 1.8" />
      )}
      {status === "root-treated" && (
        <>
          {shape.roots.map((d, i) => (
            <path key={`rt-${i}`} d={d} fill="oklch(0.7 0.18 25)" opacity={0.55} />
          ))}
          <circle cx="20" cy={cat === "molar" ? 22 : 20} r="2" fill="oklch(0.45 0.16 25)" />
        </>
      )}
      {status === "bridge" && (
        <path d={shape.crown} fill="none" stroke={BRIDGE.outline} strokeWidth={1.6} strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** Find runs of consecutive bridge-status teeth in a row. */
function bridgeRuns(numbers: number[], teeth: Record<number, ToothState>) {
  const runs: { start: number; end: number }[] = [];
  let i = 0;
  while (i < numbers.length) {
    if (teeth[numbers[i]]?.status === "bridge") {
      const start = i;
      while (i < numbers.length && teeth[numbers[i]]?.status === "bridge") i++;
      runs.push({ start, end: i - 1 });
    } else {
      i++;
    }
  }
  return runs;
}

function Row({
  numbers,
  isUpper,
  teeth,
  selected,
  onSelect,
  highlighted,
}: { numbers: number[]; isUpper: boolean } & Props) {
  const hSet = new Set(highlighted ?? []);
  const runs = bridgeRuns(numbers, teeth);
  const runLookup = new Map<number, "single" | "left" | "middle" | "right">();
  for (const r of runs) {
    if (r.start === r.end) {
      runLookup.set(r.start, "single");
    } else {
      runLookup.set(r.start, "left");
      runLookup.set(r.end, "right");
      for (let k = r.start + 1; k < r.end; k++) runLookup.set(k, "middle");
    }
  }

  const N = numbers.length;

  return (
    <div className="relative flex w-full items-end justify-center gap-0.5 sm:gap-1">
      {/* Bridge band overlay — sits behind the teeth */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {runs.map((r, i) => {
          const left = (r.start / N) * 100;
          const width = ((r.end - r.start + 1) / N) * 100;
          return (
            <div
              key={i}
              className="absolute rounded-md"
              style={{
                left: `calc(${left}% + 1px)`,
                width: `calc(${width}% - 2px)`,
                top: isUpper ? "0%" : "12%",
                bottom: isUpper ? "12%" : "0%",
                background: `linear-gradient(${isUpper ? "180deg" : "0deg"}, ${BRIDGE.bandSoft} 0%, ${BRIDGE.band} 100%)`,
                opacity: 0.35,
                boxShadow: `inset 0 0 0 1px ${BRIDGE.bar}55`,
              }}
            />
          );
        })}
      </div>

      {numbers.map((n, idx) => {
        const t = teeth[n];
        const isSel = selected === n;
        const isHi = hSet.has(n);
        const bridgePos = runLookup.get(idx);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect?.(n)}
            className={cn(
              "group relative z-10 flex min-w-0 flex-1 flex-col items-center",
              isUpper ? "flex-col" : "flex-col-reverse",
            )}
          >
            <div
              className={cn(
                "aspect-[1/2] w-full max-w-[44px] rounded-md transition-all",
                isSel
                  ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : isHi
                    ? "scale-105 ring-2 ring-[oklch(0.55_0.18_290)] ring-offset-2 ring-offset-background"
                    : "hover:scale-105",
              )}
            >
              <ToothSVG number={n} status={t?.status ?? "intact"} bridgePosition={bridgePos} />
            </div>
            <span
              className={cn(
                "mt-1 text-[10px] font-medium tabular-nums sm:text-xs",
                isSel
                  ? "text-primary font-bold"
                  : isHi
                    ? "font-bold text-[oklch(0.45_0.18_290)]"
                    : bridgePos
                      ? "font-bold text-[oklch(0.4_0.16_150)]"
                      : "text-muted-foreground",
              )}
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TeethChart({ teeth, selected, onSelect, highlighted }: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-3 sm:p-5">
      <Row numbers={UPPER_TEETH} isUpper teeth={teeth} selected={selected} onSelect={onSelect} highlighted={highlighted} />
      <div className="mx-auto h-px w-full bg-border" />
      <Row numbers={LOWER_TEETH} isUpper={false} teeth={teeth} selected={selected} onSelect={onSelect} highlighted={highlighted} />
    </div>
  );
}
