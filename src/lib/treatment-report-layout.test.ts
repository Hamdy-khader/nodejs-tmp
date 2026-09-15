import { describe, expect, it } from "vitest";
import { buildTreatmentReportPages } from "./treatment-report-layout";
import { defaultTeeth, type TreatmentPlan } from "./patients-store";
const base: TreatmentPlan = {
  id: "test",
  patientId: "test",
  name: "Plan",
  notes: "",
  teeth: defaultTeeth(),
  createdAt: 0,
  updatedAt: 0,
};
describe("treatment report pagination", () => {
  it("preserves every treatment exactly once across continuation pages", () => {
    const items = Array.from({ length: 70 }, (_, i) => ({
      id: String(i),
      name: "Zirconia crown",
      amount: 1,
      unitPrice: 250,
    }));
    const plan: TreatmentPlan = {
      ...base,
      treatments: [
        { id: "visit", kind: "visit", label: "Second stage", note: "Visit note", items },
        { id: "healing", kind: "healing", label: "Three months", days: 90 },
      ],
    };
    const pages = buildTreatmentReportPages(plan);
    expect(pages.length).toBeGreaterThan(2);
    const rows = pages.flatMap((page) => page.treatmentRows ?? []);
    expect(
      rows.flatMap((row) => (row.kind === "visit" ? row.items.map((item) => item.id) : [])),
    ).toEqual(items.map((item) => item.id));
    expect(rows.filter((row) => row.note === "Visit note")).toHaveLength(1);
    expect(
      rows.filter((row) => row.kind === "visit").every((row) => row.label === "Second stage"),
    ).toBe(true);
    expect(rows.at(-1)).toMatchObject({ kind: "healing", label: "Three months", days: 90 });
    expect(pages.filter((page) => page.showTreatmentChart)).toHaveLength(1);
    expect(pages.filter((page) => page.showTotals)).toEqual([pages.at(-1)]);
    expect(items).toHaveLength(70);
  });
  it("still renders one treatment page for an empty plan", () => {
    const pages = buildTreatmentReportPages(base);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ showTreatmentChart: true, showTotals: true });
  });
});
