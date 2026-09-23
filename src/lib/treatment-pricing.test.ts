import { expect, it } from "vitest";
import type { TreatmentRow } from "./patients-store";
import { setTreatmentTotal, treatmentTotals, withoutTotalAdjustment } from "./treatment-pricing";
const rows: TreatmentRow[] = [{ id: "v", kind: "visit", items: [{ id: "i", name: "Filling", amount: 2, unitPrice: 150 }] }];
const uid = () => crypto.randomUUID();
it.each([0, 100.25, 500.75])("sets total to %s without changing treatment prices", target => {
  const next = setTreatmentTotal(rows, target, uid);
  expect(treatmentTotals(next).total).toBeCloseTo(target, 2);
  expect(next[0]).toEqual(rows[0]);
  expect(withoutTotalAdjustment(next)).toEqual(rows);
});
it("sets a price for an empty plan and replaces previous adjustments", () => {
  const next = setTreatmentTotal([], 125.5, uid);
  expect(treatmentTotals(next).total).toBe(125.5);
  expect(treatmentTotals(setTreatmentTotal(next, 80, uid)).total).toBe(80);
  expect(setTreatmentTotal(next, 0, uid)).toEqual([]);
});
it("accounts for percentage and fixed discounts, including an over-discounted plan", () => {
  const discounted: TreatmentRow[] = [...rows, { id: "d", kind: "discount", mode: "percent", value: 15 }, { id: "f", kind: "discount", mode: "amount", value: 400 }];
  expect(treatmentTotals(setTreatmentTotal(discounted, 400.13, uid)).total).toBeCloseTo(400.13, 2);
});
it("rejects invalid totals and an increase blocked by a full percentage discount", () => {
  expect(() => setTreatmentTotal(rows, -1, uid)).toThrow();
  expect(() => setTreatmentTotal(rows, NaN, uid)).toThrow();
  expect(() => setTreatmentTotal([...rows, { id: "d", kind: "discount", mode: "percent", value: 100 }], 50, uid)).toThrow(/100%/);
});
