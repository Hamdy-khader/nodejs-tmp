import { describe, expect, it } from "vitest";
import { groupAmountPatches, groupTreatmentItems, treatmentItemsTotal } from "./treatment-groups";
import { UPPER_TEETH, LOWER_TEETH, type TreatmentItem } from "./patients-store";

const tooth = (id: string, toothNumber: number, unitPrice = 265): TreatmentItem => ({
  id,
  toothNumber,
  name: "Veneer",
  amount: 1,
  unitPrice,
  catalogItemId: "veneer",
});

describe("grouped treatments", () => {
  it.each(["Ceramic bridge on implant", "Extraction", "Implant"])("separates both jaws for %s without changing quantities or totals", name => {
    const items = [...UPPER_TEETH, ...LOWER_TEETH].map(number => ({ ...tooth(String(number), number), name }));
    const before = structuredClone(items);
    const groups = groupTreatmentItems(items);
    expect(groups).toMatchObject([
      { jaw: "Upper jaw", teeth: [...UPPER_TEETH].sort((a, b) => a - b), amount: 16, total: 4240 },
      { jaw: "Lower jaw", teeth: [...LOWER_TEETH].sort((a, b) => a - b), amount: 16, total: 4240 },
    ]);
    expect(treatmentItemsTotal(items)).toBe(8480);
    expect(items).toEqual(before);
  });
  it("starts a new row when the same treatment is added after another one", () => {
    const other = { ...tooth("x", 15), name: "Crown" };
    const groups = groupTreatmentItems([tooth("a", 17), other, tooth("b", 16)]);
    expect(groups.map(group => group.teeth)).toEqual([[17], [15], [16]]);
  });
  it("preserves saved group order and scopes amount edits to one jaw", () => {
    const groups = groupTreatmentItems([tooth("a", 31), tooth("b", 11), tooth("c", 41), tooth("d", 21)]);
    expect(groups.map(group => group.teeth)).toEqual([[31, 41], [11, 21]]);
    expect(groupAmountPatches(groups[0], 3)).toEqual({ a: { amount: 2 }, c: { amount: 1 } });
  });
  it("splits a shared package into jaw rows while charging it once, including on continuation pages", () => {
    const items = [11, 21, 31, 41].map(number => ({ ...tooth(String(number), number), priceMode: "package" as const }));
    expect(groupTreatmentItems(items)).toMatchObject([
      { jaw: "Upper jaw", amount: 2, total: 265, packageIncluded: false, packageItems: items },
      { jaw: "Lower jaw", amount: 2, total: 0, packageIncluded: true, packageItems: items },
    ]);
    expect(groupTreatmentItems(items.slice(2), items)).toMatchObject([{ total: 0, packageIncluded: true }]);
    expect(treatmentItemsTotal(items)).toBe(265);
    expect(treatmentItemsTotal(items.slice(2))).toBe(265);
  });
  it.each(["free", "in-package"] as const)("separates %s treatments by jaw without charging either", priceMode => {
    const groups = groupTreatmentItems([11, 31].map(number => ({ ...tooth(String(number), number), priceMode })));
    expect(groups.map(group => [group.jaw, group.total])).toEqual([["Upper jaw", 0], ["Lower jaw", 0]]);
  });
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
