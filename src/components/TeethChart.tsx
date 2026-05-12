import { UPPER_TEETH, LOWER_TEETH, STATUS_META, type ToothState, type ToothStatus } from "@/lib/patients-store";
import { cn } from "@/lib/utils";

interface Props {
  teeth: Record<number, ToothState>;
  selected?: number | null;
  onSelect?: (n: number) => void;
}

function ToothSVG({ status, isUpper }: { status: ToothStatus; isUpper: boolean }) {
  const meta = STATUS_META[status];
  if (status === "missing") {
    return (
      <svg viewBox="0 0 40 60" className="h-full w-full">
        <line x1="8" y1="10" x2="32" y2="50" stroke="oklch(0.55 0.02 0)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="10" x2="8" y2="50" stroke="oklch(0.55 0.02 0)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "implant") {
    return (
      <svg viewBox="0 0 40 60" className="h-full w-full">
        <rect x="16" y="8" width="8" height="14" rx="2" fill={meta.color} stroke={meta.ring} strokeWidth="1.5" />
        <path d="M14 22 L26 22 L24 38 Q24 46 20 50 Q16 46 16 38 Z" fill={meta.color} stroke={meta.ring} strokeWidth="1.5" />
        {[26, 30, 34, 38].map((y) => (
          <line key={y} x1="16" y1={y} x2="24" y2={y} stroke={meta.ring} strokeWidth="0.6" />
        ))}
      </svg>
    );
  }
  // crown shape (upper / lower mirrored)
  const crown = isUpper
    ? "M8 14 Q10 6 20 6 Q30 6 32 14 L30 30 Q28 36 20 38 Q12 36 10 30 Z"
    : "M10 6 Q12 4 20 4 Q28 4 30 6 L32 22 Q30 30 20 32 Q10 30 8 22 Z";
  const root = isUpper
    ? "M11 28 Q14 50 18 56 Q20 58 22 56 Q26 50 29 28 Z"
    : "M11 14 Q14 38 18 44 Q20 46 22 44 Q26 38 29 14 Z";
  return (
    <svg viewBox="0 0 40 60" className="h-full w-full">
      <path d={root} fill="oklch(0.97 0.01 60)" stroke={meta.ring} strokeWidth="1.2" />
      <path d={crown} fill={meta.color} stroke={meta.ring} strokeWidth="1.5" />
      {status === "caries" && (
        <circle cx="20" cy={isUpper ? 18 : 14} r="3.5" fill="oklch(0.35 0.1 30)" />
      )}
      {status === "filled" && (
        <rect x="15" y={isUpper ? 14 : 10} width="10" height="6" rx="1.2" fill="oklch(0.4 0.02 250)" />
      )}
      {status === "crown" && (
        <path d={crown} fill="none" stroke="oklch(0.45 0.13 80)" strokeWidth="2" strokeDasharray="2 2" />
      )}
      {status === "root-treated" && (
        <path d="M20 30 L20 50" stroke="oklch(0.3 0.18 25)" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {status === "bridge" && (
        <path d={crown} fill="none" stroke="oklch(0.4 0.13 280)" strokeWidth="2" />
      )}
    </svg>
  );
}

function Row({ numbers, isUpper, teeth, selected, onSelect }: { numbers: number[]; isUpper: boolean } & Props) {
  return (
    <div className="flex w-full items-end justify-center gap-0.5 sm:gap-1">
      {numbers.map((n) => {
        const t = teeth[n];
        const isSel = selected === n;
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
                "aspect-[2/3] w-full max-w-[36px] rounded-md transition-all",
                isSel
                  ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "hover:scale-105",
              )}
            >
              <ToothSVG status={t?.status ?? "intact"} isUpper={isUpper} />
            </div>
            <span
              className={cn(
                "mt-1 text-[10px] font-medium tabular-nums sm:text-xs",
                isSel ? "text-primary" : "text-muted-foreground",
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

export function TeethChart({ teeth, selected, onSelect }: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
      <Row numbers={UPPER_TEETH} isUpper teeth={teeth} selected={selected} onSelect={onSelect} />
      <div className="mx-auto h-px w-2/3 bg-border" />
      <Row numbers={LOWER_TEETH} isUpper={false} teeth={teeth} selected={selected} onSelect={onSelect} />
    </div>
  );
}
