import {
  LOWER_TEETH,
  UPPER_TEETH,
  type ToothState,
  type TreatmentRow,
  type TreatmentItem,
} from "./patients-store";
import { getToothStatusForTreatment } from "./treatment-catalog";
import { getDentalVisual, normalizeDentalName } from "./dental-visuals";
import type { ToothAnnotation } from "@/components/TeethChart";

export function getTreatmentTargets(item: TreatmentItem): number[] {
  if (item.toothNumber != null) return [item.toothNumber];
  const bridge = /^bridge (\d+)-(\d+)$/i.exec(item.name.trim());
  if (!bridge) return [];
  for (const jaw of [UPPER_TEETH, LOWER_TEETH]) {
    const a = jaw.indexOf(Number(bridge[1]));
    const b = jaw.indexOf(Number(bridge[2]));
    if (a >= 0 && b >= 0) return jaw.slice(Math.min(a, b), Math.max(a, b) + 1);
  }
  return [];
}

export function getTreatmentAnnotations(
  rows: TreatmentRow[],
  lookup = new Map<string, string>(),
): Record<number, ToothAnnotation[]> {
  const annotations: Record<number, ToothAnnotation[]> = {};
  for (const row of rows) {
    if (row.kind !== "visit") continue;
    for (const item of row.items) {
      const section = item.catalogSectionKey ?? lookup.get(normalizeDentalName(item.name));
      const visual = getDentalVisual(item.name, { treatment: true, section });
      for (const number of getTreatmentTargets(item)) {
        const bucket = (annotations[number] ??= []);
        // Keep the most recent procedure last, even when it repeats an earlier one.
        const previousIndex = bucket.findIndex((annotation) => annotation.id === visual.key);
        if (previousIndex >= 0) bucket.splice(previousIndex, 1);
        bucket.push({
          id: visual.key,
          label: item.name,
          shortLabel: visual.shortLabel,
          color: visual.color,
          background: visual.background,
          border: visual.border,
          visual,
        });
      }
    }
  }
  return annotations;
}

/** Treatment previews are derived so removing a row restores the diagnosis. */
export function getTreatmentTeeth(
  baseline: Record<number, ToothState>,
  rows: TreatmentRow[],
  lookup = new Map<string, string>(),
): Record<number, ToothState> {
  const teeth = { ...baseline };
  for (const row of rows) {
    if (row.kind !== "visit") continue;
    for (const item of row.items) {
      const section =
        item.catalogSectionKey ??
        lookup.get(item.name.trim().toLowerCase().replace(/\s+/g, " ")) ??
        "";
      const status = getToothStatusForTreatment(section, item.name);
      for (const number of getTreatmentTargets(item)) {
        if (teeth[number])
          teeth[number] = {
            ...teeth[number],
            status: status ?? teeth[number].status,
            note: item.name,
          };
      }
    }
  }
  return teeth;
}
