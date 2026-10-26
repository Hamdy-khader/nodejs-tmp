import type { TreatmentItem, TreatmentPriceMode } from "./patients-store";

export const PRICE_MODES: Record<TreatmentPriceMode, string> = {
  unit: "Unit price", package: "Package price", free: "Free", "in-package": "In package",
};

export interface TreatmentItemGroup {
  id: string;
  jaw: "Upper jaw" | "Lower jaw" | null;
  items: TreatmentItem[];
  teeth: number[];
  amount: number;
  unitPrice: number;
  total: number;
  priceMode: TreatmentPriceMode;
  packageItems?: TreatmentItem[];
  packageIncluded: boolean;
}

function treatmentKey(item: TreatmentItem): string {
  return item.toothNumber == null ? item.id : JSON.stringify([
    item.name, item.catalogItemId, item.catalogItemKey, item.catalogSectionKey,
    item.catalogGroupKey, item.unitPrice, item.priceMode ?? "unit",
  ]);
}

function treatmentJaw(number: number | undefined): TreatmentItemGroup["jaw"] {
  if (number == null || number % 10 < 1 || number % 10 > 8) return null;
  const quadrant = Math.floor(number / 10);
  return quadrant === 1 || quadrant === 2 ? "Upper jaw"
    : quadrant === 3 || quadrant === 4 ? "Lower jaw" : null;
}

function displayKey(item: TreatmentItem): string {
  return JSON.stringify([treatmentKey(item), treatmentJaw(item.toothNumber) ?? item.toothNumber]);
}

/**
 * A display group keeps the original per-tooth records and their saved prices.
 * Only consecutive items of one treatment join, one row per jaw: teeth added
 * together form one row, the same treatment added after something else starts
 * a new row until Autocorrect brings them together.
 */
export function groupTreatmentItems(items: TreatmentItem[], visitItems = items): TreatmentItemGroup[] {
  const groups: TreatmentItemGroup[] = [];
  let block: { key: string; byJaw: Map<string, TreatmentItemGroup> } | null = null;
  // A package can cover both jaws. Splitting its display must not charge it twice.
  // Reports pass the full visit so a continuation page retains the same package owner.
  const packages = new Map<string, TreatmentItem[]>();
  for (const item of visitItems) {
    if (item.priceMode !== "package") continue;
    const key = treatmentKey(item);
    const entries = packages.get(key) ?? [];
    entries.push(item);
    packages.set(key, entries);
  }
  for (const item of items) {
    const jaw = treatmentJaw(item.toothNumber);
    const key = displayKey(item);
    if (block?.key !== treatmentKey(item)) block = { key: treatmentKey(item), byJaw: new Map() };
    let group = block.byJaw.get(key);
    if (!group) {
      group = { id: item.id, jaw, items: [], teeth: [], amount: 0, unitPrice: item.unitPrice, total: 0, priceMode: item.priceMode ?? "unit", packageIncluded: false };
      group.packageItems = packages.get(treatmentKey(item));
      group.packageIncluded = Boolean(group.packageItems && displayKey(group.packageItems[0]) !== key);
      block.byJaw.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
    if (item.toothNumber != null && !group.teeth.includes(item.toothNumber))
      group.teeth.push(item.toothNumber);
    group.amount += item.amount;
    group.total = group.priceMode === "package" ? (group.packageIncluded ? 0 : group.unitPrice)
      : group.priceMode === "unit" ? group.amount * group.unitPrice : 0;
  }
  for (const group of groups) group.teeth.sort((a, b) => a - b);
  return groups;
}

/** Quantity is independent of the number of assigned teeth. */
export function groupAmountPatches(
  group: TreatmentItemGroup,
  amount: number,
): Record<string, Partial<TreatmentItem>> | null {
  if (!Number.isInteger(amount) || amount < 1) return null;
  const base = Math.floor(amount / group.items.length);
  const remainder = amount % group.items.length;
  return Object.fromEntries(
    group.items.map((item, index) => [item.id, { amount: base + (index < remainder ? 1 : 0) }]),
  );
}

export function treatmentItemsTotal(items: TreatmentItem[]) {
  return groupTreatmentItems(items).reduce((sum, group) => sum + group.total, 0);
}
