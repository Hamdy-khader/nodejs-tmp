import { describe, expect, it } from "vitest";
import { buildTreatmentReportPages } from "./treatment-report-layout";
import { defaultTeeth, type TreatmentPlan } from "./patients-store";
import type { PlanSettings } from "./plan-settings-store";
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
  it("places short documents below treatment totals on the same page", () => {
    const docs = [{ title: "Aftercare", body: "Care instructions." }, { title: "Next steps", body: "Return for review." }];
    const pages = buildTreatmentReportPages(base, undefined, docs);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ kind: "suggested", showTotals: true, documents: docs });
  });
  it("fills remaining treatment space and continues text without losing or duplicating content", () => {
    const body = "Long aftercare instructions with detailed information.\n".repeat(100);
    const pages = buildTreatmentReportPages(base, undefined, [{ title: "Aftercare", body }, { title: "Next steps", body: "Review." }]);
    expect(pages[0].documents?.[0].body?.length).toBeGreaterThan(0);
    expect(pages.length).toBeGreaterThan(2);
    const fragments = pages.flatMap(page => page.documents ?? []);
    expect(fragments.slice(0, -1).map(doc => doc.body).join("")).toBe(body);
    expect(fragments.filter(doc => doc.title === "Aftercare")).toHaveLength(1);
    expect(fragments.at(-1)).toEqual({ title: "Next steps", body: "Review." });
  });
  const settings = (pageSize: PlanSettings["pageSize"], showPrices = true): PlanSettings => ({
    language: "English", pageSize, priceListDesign: "detailed", updatedAt: 0,
    pricePage: { showPrices, showSubtotal: true, showTotal: true, showDiscount: true, showTax: false, showInsurance: false, currency: "EUR" },
    planSections: { showDiagnosis: true, showTreatments: true, showDocuments: true, showOverview: true },
    pageDesign: { frontCover: { clinicName: "Clinic", title: "Plan" }, innerPages: { headerText: "", footerLeft: "Clinic", footerRight: "", showFooter: true }, backCover: { title: "" } },
  });
  const planWithItems = (count: number): TreatmentPlan => ({ ...base, treatments: [{ id: "visit", kind: "visit", items: Array.from({ length: count }, (_, i) => ({ id: String(i), name: "Metal-Ceramic Crown", toothNumber: 12, amount: 1, unitPrice: 200 })) }] });
  it("keeps totals with ten short treatments when they fit on the first A4 page", () => {
    const pages = buildTreatmentReportPages(planWithItems(10), settings("A4"));
    expect(pages).toHaveLength(1);
    expect(pages[0].showTotals).toBe(true);
    expect(pages[0].treatmentRows?.[0]).toMatchObject({ items: expect.any(Array) });
  });
  it("uses the selected paper size rather than a fixed first-page limit", () => {
    expect(buildTreatmentReportPages(planWithItems(10), settings("Letter"))).toHaveLength(2);
    expect(buildTreatmentReportPages(planWithItems(10), settings("Legal"))).toHaveLength(1);
  });
  it("does not reserve price rows when prices are hidden", () => {
    expect(buildTreatmentReportPages(planWithItems(12), settings("A4", false))).toHaveLength(1);
    expect(buildTreatmentReportPages(planWithItems(12), settings("A4", true))).toHaveLength(2);
  });
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
