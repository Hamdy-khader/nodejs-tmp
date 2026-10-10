import { DENTAL_MARKS, type DentalVisual } from "@/lib/dental-visuals";

export function DentalMarkPath({ visual }: { visual: DentalVisual }) {
  return (
    <path
      data-dental-mark={visual.mark}
      d={DENTAL_MARKS[visual.mark]}
      fill={visual.mark === "caries" ? visual.color : "none"}
      stroke={visual.color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function DentalSymbol({ visual, className }: { visual: DentalVisual; className?: string }) {
  // Fit crown, gum and root symbols equally within a compact legend swatch.
  const root = [
    "fracturedRoot",
    "resorption",
    "sinus",
    "apical",
    "cyst",
    "granuloma",
    "apicoectomy",
  ].includes(visual.mark);
  const gum = [
    "plaque",
    "gingivitis",
    "periodontitis",
    "boneLoss",
    "overgrowth",
    "recession",
    "gummy",
    "dentures",
    "graft",
    "gingivectomy",
    "pocket",
    "lengthening",
    "scaling",
  ].includes(visual.mark);
  const tall = [
    "root",
    "rootOne",
    "rootTwo",
    "rootThree",
    "retreatment",
    "post",
    "pin",
    "implant",
    "screw",
    "necrosis",
    "implantRemoval",
  ].includes(visual.mark);
  return (
    <svg
      viewBox={tall ? "0 0 40 80" : root ? "0 45 40 36" : gum ? "0 24 40 36" : "0 0 40 40"}
      className={className}
      aria-hidden="true"
    >
      <DentalMarkPath visual={visual} />
    </svg>
  );
}
