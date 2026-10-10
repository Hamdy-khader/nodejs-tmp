import type { TreatmentItem, TreatmentPriceMode } from "./patients-store";

export const PRICE_MODES: Record<TreatmentPriceMode, string> = {
  unit: "Unit price", package: "Package price", free: "Free", "in-package": "In package",
};

export interface TreatmentItemGroup {
  id: string;
  items: TreatmentItem[];
  teeth: number[];
  amount: number;
  unitPrice: number;
  total: number;
  priceMode: TreatmentPriceMode;
}

/** A display group keeps the original per-tooth records and their saved prices. */
export function groupTreatmentItems(items: TreatmentItem[]): TreatmentItemGroup[] {
  const groups: TreatmentItemGroup[] = [];
  const byKey = new Map<string, TreatmentItemGroup>();
  for (const item of items) {
    const key =
      item.toothNumber == null
        ? item.id
        : JSON.stringify([
            item.name,
            item.catalogItemId,
            item.catalogItemKey,
            item.catalogSectionKey,
            item.catalogGroupKey,
            item.unitPrice,
            item.priceMode ?? "unit",
          ]);
    let group = byKey.get(key);
    if (!group) {
      group = { id: item.id, items: [], teeth: [], amount: 0, unitPrice: item.unitPrice, total: 0, priceMode: item.priceMode ?? "unit" };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
    if (item.toothNumber != null && !group.teeth.includes(item.toothNumber))
      group.teeth.push(item.toothNumber);
    group.amount += item.amount;
    group.total = group.priceMode === "package" ? group.unitPrice
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
