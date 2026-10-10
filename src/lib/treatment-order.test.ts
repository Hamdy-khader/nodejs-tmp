import { describe, expect, it } from "vitest";
import type { TreatmentRow } from "./patients-store";
import { moveTreatment } from "./treatment-order";

const rows: TreatmentRow[] = [
  { id: "v1", kind: "visit", label: "First", items: [{ id: "a", name: "Implant", toothNumber: 12, amount: 1, unitPrice: 400 }] },
  { id: "h", kind: "healing", days: 30, note: "Wait" },
  { id: "d", kind: "discount", mode: "percent", value: 10 },
  { id: "v2", kind: "visit", label: "Second", items: [{ id: "b", name: "Crown", amount: 2, unitPrice: 200 }] },
];
describe("treatment order", () => {
  it("moves all teeth in a displayed group together and places them after the full target group", () => {
    const groupRows: TreatmentRow[] = [
      { id: "a", kind: "visit", items: [
        { id: "a1", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 265 },
        { id: "a2", name: "Veneer", toothNumber: 12, amount: 1, unitPrice: 265 },
      ] },
      { id: "b", kind: "visit", items: [
        { id: "b1", name: "Crown", toothNumber: 21, amount: 1, unitPrice: 300 },
        { id: "b2", name: "Crown", toothNumber: 22, amount: 1, unitPrice: 300 },
      ] },
    ];
    const result = moveTreatment(groupRows, { kind: "item", id: "a1", itemIds: ["a1", "a2"] }, { kind: "item", id: "b1", itemIds: ["b1", "b2"] }, "after");
    expect(result[0]).toMatchObject({ items: [] });
    expect(result[1]).toMatchObject({ items: [{ id: "b1" }, { id: "b2" }, { id: "a1", toothNumber: 11 }, { id: "a2", toothNumber: 12 }] });
    expect(groupRows[0]).toMatchObject({ items: [{ id: "a1" }, { id: "a2" }] });
  });
  it.each(["h", "d", "v2"])("moves %s to the top and back without changing any data", id => {
    const original = structuredClone(rows);
    const moved = moveTreatment(rows, { kind: "row", id }, { kind: "row", id: "v1" }, "before");
    expect(moved[0].id).toBe(id);
    const index = rows.findIndex(r => r.id === id);
    expect(moveTreatment(moved, { kind: "row", id }, { kind: "row", id: rows[index - 1].id }, "after")).toEqual(original);
    expect(rows).toEqual(original);
  });
  it("moves items across visits and back, including an empty destination", () => {
    const moved = moveTreatment(rows, { kind: "item", id: "a" }, { kind: "item", id: "b" }, "after");
    expect(moved[0]).toMatchObject({ items: [] });
    expect(moved[3]).toMatchObject({ items: [{ id: "b" }, { id: "a", toothNumber: 12, unitPrice: 400 }] });
    expect(moveTreatment(moved, { kind: "item", id: "a" }, { kind: "row", id: "v1" }, "after")).toEqual(rows);
  });
  it("rejects dropping items on healing periods or dropping deleted rows", () => {
    expect(moveTreatment(rows, { kind: "item", id: "a" }, { kind: "row", id: "h" }, "after")).toBe(rows);
    expect(moveTreatment(rows, { kind: "row", id: "deleted" }, { kind: "row", id: "v1" }, "before")).toBe(rows);
  });
});
