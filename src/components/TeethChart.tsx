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

// ─── Anatomy constants ──────────────────────────────────────────────────────
// viewBox 0 0 40 80
// Crown: y 4–37   |   Gum band: y 33–41   |   Roots: y 37–77
const GUM_Y = 37;

const SHAPES: Record<Cat, { crown: string; roots: string[] }> = {
  incisor: {
    crown: `M13 ${GUM_Y} L13 15 Q13 7 20 7 Q27 7 27 15 L27 ${GUM_Y} Z`,
    roots: [`M14.5 ${GUM_Y} C14 52 16.5 71 20 75 C23.5 71 25.5 52 25.5 ${GUM_Y} Z`],
  },
  canine: {
    crown: `M11 ${GUM_Y} C11.5 30 14.5 18 19 8 Q20 5 21 8 C25.5 18 28.5 30 29 ${GUM_Y} Z`,
    roots: [`M13 ${GUM_Y} C12 55 15.5 73 20 77 C24.5 73 28 55 27 ${GUM_Y} Z`],
  },
  premolar: {
    crown: `M9.5 ${GUM_Y} C9.5 26 13 11.5 20 10 C27 11.5 30.5 26 30.5 ${GUM_Y} L27.5 38.5 L20 ${GUM_Y} L12.5 38.5 Z`,
    roots: [
      `M12 38.5 C10.5 53 13 70 16.5 74.5 C18 75.5 18 70 17.5 59 L16 38.5 Z`,
      `M28 38.5 C29.5 53 27 70 23.5 74.5 C22 75.5 22 70 22.5 59 L24 38.5 Z`,
    ],
  },
  molar: {
    crown: `M5.5 ${GUM_Y} C5.5 24 9 10.5 16.5 7.5 Q20 5 23.5 7.5 C31 10.5 34.5 24 34.5 ${GUM_Y} L31 38.5 L26 ${GUM_Y} L20 38.5 L14 ${GUM_Y} L9 38.5 Z`,
    roots: [
      `M8.5 38.5 L9.5 42 C8 56 11 70 14 74.5 C15.5 75.5 15.5 70 15 60 L13.5 42 Z`,
      `M31.5 38.5 L30.5 42 C32 56 29 70 26 74.5 C24.5 75.5 24.5 70 25 60 L26.5 42 Z`,
      `M18.5 38 L19 42 L21 42 L21.5 38 L21 58 L19 58 Z`,
    ],
  },
};

// ─── Tooth SVG ──────────────────────────────────────────────────────────────
function ToothSVG({
  number,
  status,
  note,
  bridgePosition,
}: {
  number: number;
  status: ToothStatus;
  note?: string;
  bridgePosition?: "single" | "left" | "middle" | "right";
}) {
  const cat = categoryOf(number);
  const isUpper = number < 30;
  const shape = SHAPES[cat];
  const id = `tk${number}`; // unique per tooth (FDI numbers are globally unique)

  const transform = isUpper ? undefined : "rotate(180,20,40)";

  // ── Missing tooth ────────────────────────────────────────────────────────
  if (status === "missing") {
    return (
      <svg viewBox="0 0 40 80" className="h-full w-full">
        <defs>
          <linearGradient id={`${id}-socket`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8E4DE" />
            <stop offset="100%" stopColor="#D4CEC6" />
          </linearGradient>
        </defs>
        {/* Empty socket outline */}
        <path
          d={shape.roots[0]}
          fill={`url(#${id}-socket)`}
          stroke="#B8B0A8"
          strokeWidth="0.8"
          strokeDasharray="2.5 1.5"
          transform={transform}
        />
        {/* Stylized X on crown area */}
        <g transform={transform}>
          <line x1="14" y1="14" x2="26" y2="28" stroke="#C0776A" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <line x1="26" y1="14" x2="14" y2="28" stroke="#C0776A" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </g>
      </svg>
    );
  }

  // ── Implant ──────────────────────────────────────────────────────────────
  if (status === "implant") {
    const threadColor = "#8AAFC8";
    const threads = [24, 30, 36, 42, 48, 54, 60, 66];
    return (
      <svg viewBox="0 0 40 80" className="h-full w-full">
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5C7FA0" />
            <stop offset="40%" stopColor="#7AA8CC" />
            <stop offset="70%" stopColor="#4A6E8E" />
            <stop offset="100%" stopColor="#3A5878" />
          </linearGradient>
          <linearGradient id={`${id}-abutment`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8BB4D0" />
            <stop offset="100%" stopColor="#4A6E8E" />
          </linearGradient>
        </defs>
        <g transform={transform}>
          {/* Abutment / crown cap */}
          <rect x="13" y="8" width="14" height="13" rx="3" fill={`url(#${id}-abutment)`} stroke="#3A5878" strokeWidth="0.9" />
          <rect x="15" y="9.5" width="10" height="3" rx="1" fill="white" opacity="0.25" />
          {/* Screw body */}
          <path d="M13 21 L27 21 L25 71 Q22.5 76 20 76 Q17.5 76 15 71 Z" fill={`url(#${id}-metal)`} stroke="#3A5878" strokeWidth="0.9" />
          {/* Threading */}
          {threads.map((y) => (
            <line key={y} x1="14" y1={y} x2="26" y2={y} stroke={threadColor} strokeWidth="0.7" />
          ))}
          {/* Apex dot */}
          <circle cx="20" cy="75" r="1.5" fill="#3A5878" />
        </g>
      </svg>
    );
  }

  // ── Bridge geometry ──────────────────────────────────────────────────────
  const isBridge = status === "bridge" && bridgePosition !== undefined;
  const barLeft  = bridgePosition === "left"  || bridgePosition === "single" ? 4 : -6;
  const barRight = bridgePosition === "right" || bridgePosition === "single" ? 36 : 46;
  const BRIDGE_COLOR_1 = "#9B6FDB";
  const BRIDGE_COLOR_2 = "#7C4AC9";

  // ── Normal tooth defs ────────────────────────────────────────────────────
  const enamelTop    = "#F8F4ED";
  const enamelBottom = "#E4DDD0";
  const rootTop      = "#EDD8C8";
  const rootBottom   = "#CFACE0".replace("CE0","A8"); // #CFACA8? let me fix: rootBottom = "#D9BFA8"
  const gumColor     = "rgba(230,160,140,0.28)";

  const crownFill = (() => {
    if (status === "crown")  return `url(#${id}-gold)`;
    if (status === "bridge") return `url(#${id}-bridge-c)`;
    return `url(#${id}-enamel)`;
  })();

  const strokeColor = status === "crown"  ? "#8A6820"
                    : status === "bridge" ? "#5E2FA0"
                    : "#B0A090";

  return (
    <svg viewBox="0 0 40 80" className="h-full w-full" style={{ overflow: "visible" }}>
      <defs>
        {/* Enamel gradient */}
        <linearGradient id={`${id}-enamel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={enamelTop} />
          <stop offset="100%" stopColor={enamelBottom} />
        </linearGradient>
        {/* Root gradient */}
        <linearGradient id={`${id}-root`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F0DDCA" />
          <stop offset="100%" stopColor="#D9BFA8" />
        </linearGradient>
        {/* Crown gold gradient */}
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#F5D97A" />
          <stop offset="35%"  stopColor="#E0B840" />
          <stop offset="75%"  stopColor="#C8980C" />
          <stop offset="100%" stopColor="#B07A00" />
        </linearGradient>
        {/* Bridge crown tint */}
        <linearGradient id={`${id}-bridge-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#D8C0F8" />
          <stop offset="100%" stopColor="#B890E8" />
        </linearGradient>
        {/* Filled (amalgam) */}
        <linearGradient id={`${id}-fill-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#7A889A" />
          <stop offset="100%" stopColor="#4E5C6E" />
        </linearGradient>
        {/* Caries gradient */}
        <radialGradient id={`${id}-caries`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#3A1A06" />
          <stop offset="60%"  stopColor="#7C3C10" />
          <stop offset="100%" stopColor="#A05520" stopOpacity="0.4" />
        </radialGradient>
        {/* Caries crackle outer ring */}
        <radialGradient id={`${id}-caries-ring`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#A05520" stopOpacity="0" />
          <stop offset="100%" stopColor="#8B3A0C" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      <g transform={transform}>
        {/* ── Bridge bar behind tooth ── */}
        {isBridge && (
          <>
            <rect
              x={barLeft} y={GUM_Y - 5}
              width={barRight - barLeft} height={10}
              rx={2.5}
              fill={BRIDGE_COLOR_1}
              opacity={0.25}
            />
            <line
              x1={barLeft} y1={GUM_Y}
              x2={barRight} y2={GUM_Y}
              stroke={BRIDGE_COLOR_2}
              strokeWidth={2.8}
              strokeLinecap={bridgePosition === "middle" ? "butt" : "round"}
              opacity={0.75}
            />
          </>
        )}

        {/* ── Roots ── */}
        {shape.roots.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={
              status === "root-treated"
                ? i === 0 ? "#E89878" : "#E88868"
                : `url(#${id}-root)`
            }
            stroke={status === "root-treated" ? "#C05030" : "#B8A090"}
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
        ))}

        {/* ── Root-treated: gutta-percha dots ── */}
        {status === "root-treated" && (() => {
          const dots: { cx: number; cy: number }[] =
            cat === "molar"    ? [{ cx: 11, cy: 73 }, { cx: 29, cy: 73 }]
          : cat === "premolar" ? [{ cx: 14, cy: 73 }, { cx: 26, cy: 73 }]
          :                      [{ cx: 20, cy: 74 }];
          return dots.map((d, i) => (
            <circle key={i} {...d} r="2.2" fill="#C04828" stroke="#901820" strokeWidth="0.6" />
          ));
        })()}

        {/* ── Root treated: pulp line on crown ── */}
        {status === "root-treated" && (
          <line
            x1="20" y1={cat === "molar" ? 15 : cat === "canine" ? 14 : 16}
            x2="20" y2={GUM_Y}
            stroke="#D05838" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"
          />
        )}

        {/* ── Gum band ── */}
        <rect
          x={cat === "molar" ? 4 : cat === "premolar" ? 8 : cat === "canine" ? 10 : 12}
          y={GUM_Y - 3.5}
          width={cat === "molar" ? 32 : cat === "premolar" ? 24 : cat === "canine" ? 20 : 16}
          height={7}
          rx={3}
          fill={gumColor}
        />

        {/* ── Crown ── */}
        <path
          d={shape.crown}
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth={status === "crown" || status === "bridge" ? 1.1 : 0.9}
          strokeLinejoin="round"
        />

        {/* ── Crown shimmer highlight ── */}
        {(status === "crown" || status === "bridge") && (
          <path
            d={shape.crown}
            fill="white"
            opacity="0.18"
            style={{ clipPath: "inset(0 40% 75% 10% round 3px)" }}
          />
        )}

        {/* ── Intact: enamel highlight ── */}
        {(status === "intact" || status === "root-treated") && (
          <path
            d={shape.crown}
            fill="white"
            opacity="0.35"
            style={{ clipPath: "inset(0 25% 72% 15% round 2px)" }}
          />
        )}

        {/* ── Caries spot ── */}
        {status === "caries" && (() => {
          const cy = cat === "molar" ? 21 : cat === "premolar" ? 20 : 19;
          const rx = cat === "molar" ? 5.5 : cat === "premolar" ? 4.5 : 3.8;
          const ry = cat === "molar" ? 4.5 : 3.8;
          return (
            <>
              {/* outer discoloration halo */}
              <ellipse cx="20" cy={cy} rx={rx + 2.5} ry={ry + 2} fill={`url(#${id}-caries-ring)`} />
              {/* cavity */}
              <ellipse cx="20" cy={cy} rx={rx} ry={ry} fill={`url(#${id}-caries)`} />
              {/* inner dark center */}
              <ellipse cx="20" cy={cy} rx={rx * 0.4} ry={ry * 0.4} fill="#1A0802" opacity="0.7" />
            </>
          );
        })()}

        {/* ── Filled restoration ── */}
        {status === "filled" && (() => {
          const fy = cat === "molar" ? 18 : cat === "premolar" ? 17 : 16;
          const fh = cat === "molar" ? 8 : 7;
          const fw = cat === "molar" ? 13 : cat === "premolar" ? 11 : 9;
          const fx = 20 - fw / 2;
          return (
            <>
              <rect
                x={fx} y={fy}
                width={fw} height={fh}
                rx="2"
                fill={`url(#${id}-fill-grad)`}
                stroke="#3A4A5A"
                strokeWidth="0.6"
              />
              {/* margin line */}
              <rect
                x={fx + 1.5} y={fy + 1}
                width={fw - 3} height={1.5}
                rx="0.5"
                fill="white"
                opacity="0.2"
              />
            </>
          );
        })()}

        {/* ── Crown: dashed margin line ── */}
        {status === "crown" && (
          <path
            d={shape.crown}
            fill="none"
            stroke="#F5D060"
            strokeWidth="1.4"
            strokeDasharray="2.5 1.5"
            opacity="0.6"
          />
        )}

        {/* ── Bridge: crown outline ── */}
        {status === "bridge" && (
          <path d={shape.crown} fill="none" stroke={BRIDGE_COLOR_2} strokeWidth="1.4" opacity="0.55" />
        )}

        {/* ── Status badge dot (bottom-right of crown) ── */}
        {status !== "intact" && (
          <circle
            cx={cat === "molar" ? 31 : cat === "premolar" ? 28 : 27}
            cy={GUM_Y - 6}
            r="3.2"
            fill={STATUS_META[status].color}
            stroke="white"
            strokeWidth="0.8"
          />
        )}

        {/* ── Note dot indicator (top-left, when note is present) ── */}
        {note && status === "intact" && (
          <circle cx="15" cy="14" r="2.8" fill="#6C8EB4" stroke="white" strokeWidth="0.8" />
        )}
      </g>
    </svg>
  );
}

// ─── Bridge run detection ────────────────────────────────────────────────────
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

// ─── Status colour strip at gum line ────────────────────────────────────────
const STATUS_STRIP: Partial<Record<ToothStatus, string>> = {
  caries:       "bg-amber-500",
  filled:       "bg-blue-500",
  crown:        "bg-yellow-400",
  "root-treated": "bg-red-400",
  implant:      "bg-slate-500",
  bridge:       "bg-violet-500",
};

// ─── Row ─────────────────────────────────────────────────────────────────────
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
      {/* Bridge band overlay */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {runs.map((r, i) => {
          const left  = (r.start / N) * 100;
          const width = ((r.end - r.start + 1) / N) * 100;
          return (
            <div
              key={i}
              className="absolute rounded-lg"
              style={{
                left:   `calc(${left}% + 1px)`,
                width:  `calc(${width}% - 2px)`,
                top:    isUpper ? "0%"  : "14%",
                bottom: isUpper ? "14%" : "0%",
                background: `linear-gradient(${isUpper ? "180deg" : "0deg"}, #E8D4FF 0%, #C8A0F0 100%)`,
                opacity: 0.3,
                boxShadow: "inset 0 0 0 1px #9B6FDB44",
              }}
            />
          );
        })}
      </div>

      {numbers.map((n, idx) => {
        const t         = teeth[n];
        const status    = t?.status ?? "intact";
        const isSel     = selected === n;
        const isHi      = hSet.has(n);
        const bridgePos = runLookup.get(idx);
        const hasStatus = status !== "intact";
        const stripCls  = STATUS_STRIP[status];

        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect?.(n)}
            className={cn(
              "group relative z-10 flex min-w-0 flex-1 flex-col items-center transition-all",
              isUpper ? "flex-col" : "flex-col-reverse",
            )}
          >
            {/* Tooth SVG wrapper */}
            <div
              className={cn(
                "aspect-[1/2] w-full max-w-[44px] rounded-lg transition-all duration-150",
                isSel
                  ? "scale-[1.14] drop-shadow-[0_0_6px_rgba(99,102,241,0.55)]"
                  : isHi
                    ? "scale-[1.08] drop-shadow-[0_0_5px_rgba(139,92,246,0.45)]"
                    : "hover:scale-[1.06] hover:drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]",
              )}
            >
              {/* Ring */}
              {isSel && (
                <div className="absolute inset-0 rounded-lg ring-2 ring-primary ring-offset-1 ring-offset-card" />
              )}
              {isHi && !isSel && (
                <div className="absolute inset-0 rounded-lg ring-2 ring-violet-500 ring-offset-1 ring-offset-card" />
              )}
              <ToothSVG
                number={n}
                status={status}
                note={t?.note}
                bridgePosition={bridgePos}
              />
            </div>

            {/* Status accent strip */}
            {hasStatus && stripCls && (
              <div
                className={cn(
                  "mt-0.5 h-[3px] rounded-full opacity-80 transition-all",
                  stripCls,
                  isSel ? "w-[60%]" : "w-[40%] group-hover:w-[55%]",
                )}
              />
            )}

            {/* Tooth number */}
            <span
              className={cn(
                "mt-0.5 text-[9px] font-semibold tabular-nums leading-none sm:text-[11px]",
                isSel
                  ? "text-primary"
                  : isHi
                    ? "text-violet-600"
                    : hasStatus
                      ? "text-foreground/80"
                      : "text-muted-foreground/70",
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

// ─── Public component ─────────────────────────────────────────────────────────
export function TeethChart({ teeth, selected, onSelect, highlighted }: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/30 p-3 shadow-inner sm:p-5">
      {/* Upper label */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Upper</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Maxilla</span>
      </div>

      <Row
        numbers={UPPER_TEETH}
        isUpper
        teeth={teeth}
        selected={selected}
        onSelect={onSelect}
        highlighted={highlighted}
      />

      {/* Midline / gum divider */}
      <div className="relative flex items-center gap-2 px-1">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card px-2.5 py-1 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-pink-300/80" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Gum</span>
          <div className="h-2 w-2 rounded-full bg-pink-300/80" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <Row
        numbers={LOWER_TEETH}
        isUpper={false}
        teeth={teeth}
        selected={selected}
        onSelect={onSelect}
        highlighted={highlighted}
      />

      {/* Lower label */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Lower</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Mandible</span>
      </div>
    </div>
  );
}
