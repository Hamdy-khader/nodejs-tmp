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

// Upper-oriented shapes: crown on TOP (y ≈ 8–38), roots BELOW (y ≈ 38–78).
// viewBox 0 0 40 80
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

function ToothSVG({ number, status }: { number: number; status: ToothStatus }) {
  const cat = categoryOf(number);
  const isUpper = number < 30;
  const meta = STATUS_META[status];
  const shape = SHAPES[cat];

  // light "crown indicator" (the pale blue area in the reference image)
  const indicatorFill = "oklch(0.92 0.04 230)"; // soft blue
  const rootFill = "#ffffff";
  const stroke = "oklch(0.42 0.04 240)";
  const strokeW = 1.1;

  // Status-driven fills
  const crownFill = (() => {
    switch (status) {
      case "intact":
        return rootFill;
      case "filled":
        return rootFill;
      case "caries":
        return rootFill;
      case "crown":
        return meta.color;
      case "implant":
      case "bridge":
      case "root-treated":
        return rootFill;
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
        {/* abutment */}
        <rect x="14" y="8" width="12" height="14" rx="2" fill={meta.color} stroke={meta.ring} strokeWidth="1.4" />
        {/* screw body */}
        <path d="M11 22 L29 22 L26 70 Q23 76 20 76 Q17 76 14 70 Z" fill={meta.color} stroke={meta.ring} strokeWidth="1.4" />
        {[28, 34, 40, 46, 52, 58, 64].map((y) => (
          <line key={y} x1="14" y1={y} x2="26" y2={y} stroke={meta.ring} strokeWidth="0.7" />
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 40 80"
      className="h-full w-full"
      style={isUpper ? undefined : { transform: "rotate(180deg)" }}
    >
      {/* roots (drawn first so crown sits on top) */}
      {shape.roots.map((d, i) => (
        <path key={i} d={d} fill={rootFill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
      ))}
      {/* crown (white base) */}
      <path d={shape.crown} fill={crownFill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
      {/* light-blue crown indicator (the pale area inside the crown in the reference) */}
      {status !== "crown" && (
        <path
          d={shape.crown}
          fill={indicatorFill}
          style={{ clipPath: "inset(0 0 35% 0)" }}
        />
      )}

      {/* status overlays on the crown */}
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
        <>
          <line x1="0" y1="38" x2="40" y2="38" stroke="oklch(0.45 0.13 280)" strokeWidth="2.4" strokeLinecap="round" />
          <path d={shape.crown} fill="none" stroke="oklch(0.45 0.13 280)" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
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
  return (
    <div className="flex w-full items-end justify-center gap-0.5 sm:gap-1">
      {numbers.map((n) => {
        const t = teeth[n];
        const isSel = selected === n;
        const isHi = hSet.has(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onSelect?.(n)}
            className={cn(
              "group flex min-w-0 flex-1 flex-col items-center",
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
              <ToothSVG number={n} status={t?.status ?? "intact"} />
            </div>
            <span
              className={cn(
                "mt-1 text-[10px] font-medium tabular-nums sm:text-xs",
                isSel
                  ? "text-primary font-bold"
                  : isHi
                    ? "font-bold text-[oklch(0.45_0.18_290)]"
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
