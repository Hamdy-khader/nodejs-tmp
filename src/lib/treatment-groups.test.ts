import { describe, expect, it } from "vitest";
import { groupAmountPatches, groupTreatmentItems, treatmentItemsTotal } from "./treatment-groups";
import type { TreatmentItem } from "./patients-store";

const tooth = (id: string, toothNumber: number, unitPrice = 265): TreatmentItem => ({
  id,
  toothNumber,
  name: "Veneer",
  amount: 1,
  unitPrice,
  catalogItemId: "veneer",
});

describe("grouped treatments", () => {
  it("groups matching teeth without changing stored records or counting a tooth twice", () => {
    const items = [
      tooth("a", 13),
      tooth("b", 11),
      tooth("c", 12),
      { ...tooth("d", 13), amount: 2 },
    ];
    const before = structuredClone(items);
    expect(groupTreatmentItems(items)).toMatchObject([
      { teeth: [11, 12, 13], amount: 5, unitPrice: 265, total: 1325 },
    ]);
    expect(items).toEqual(before);
  });
  it("keeps different prices, catalog identities and unassigned services separate", () => {
    expect(
      groupTreatmentItems([
        tooth("a", 11),
        tooth("b", 12, 200),
        { ...tooth("c", 13), catalogItemId: "other" },
        { ...tooth("d", 14), toothNumber: undefined },
        { ...tooth("e", 15), toothNumber: undefined },
      ]),
    ).toHaveLength(5);
  });
  it("distributes an edited amount while retaining every assigned tooth", () => {
    const group = groupTreatmentItems([tooth("a", 11), tooth("b", 12)])[0];
    expect(groupAmountPatches(group, 5)).toEqual({ a: { amount: 3 }, b: { amount: 2 } });
    expect(groupAmountPatches(group, 1)).toEqual({ a: { amount: 1 }, b: { amount: 0 } });
    for (const invalid of [0, -1, 2.5, Infinity, NaN])
      expect(groupAmountPatches(group, invalid)).toBeNull();
  });
  it("charges packages once per group and excludes free and included treatments", () => {
    const items: TreatmentItem[] = [
      { ...tooth("a", 11), amount: 3, priceMode: "package" },
      { ...tooth("b", 12), priceMode: "package" },
      { ...tooth("c", 13), priceMode: "free" },
      { ...tooth("d", 14), priceMode: "in-package" },
      tooth("e", 15),
    ];
    expect(groupTreatmentItems(items).map(group => group.total)).toEqual([265, 0, 0, 265]);
    expect(treatmentItemsTotal(items)).toBe(530);
  });
});
