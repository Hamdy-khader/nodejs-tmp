import { LOWER_TEETH, UPPER_TEETH, type ToothState, type TreatmentRow } from "./patients-store";
import { getToothStatusForTreatment } from "./treatment-catalog";

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
      const section = item.catalogSectionKey ?? lookup.get(item.name.trim().toLowerCase().replace(/\s+/g, " ")) ?? "";
      const status = getToothStatusForTreatment(section, item.name);
      if (!status) continue;
      let targets = item.toothNumber == null ? [] : [item.toothNumber];
      const bridge = section === "bridge" && /^Bridge (\d+)-(\d+)$/.exec(item.name);
      if (bridge && item.toothNumber == null) {
        for (const jaw of [UPPER_TEETH, LOWER_TEETH]) {
          const a = jaw.indexOf(Number(bridge[1]));
          const b = jaw.indexOf(Number(bridge[2]));
          if (a >= 0 && b >= 0) targets = jaw.slice(Math.min(a, b), Math.max(a, b) + 1);
        }
      }
      for (const number of targets) {
        if (teeth[number]) teeth[number] = { ...teeth[number], status, note: undefined };
      }
    }
  }
  return teeth;
}
