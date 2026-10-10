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
  const xrays = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `xray-${index}`, url: `/xray-${index}.png`, sortOrder: index }));
  it("shares one page between treatment totals, an X-ray and document text", () => {
    const documents = [{ title: "Aftercare", body: "Care instructions." }];
    const pages = buildTreatmentReportPages({ ...base, xrays: xrays(1) }, undefined, documents);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ showTotals: true, xrays: [{ title: "X-ray 1", imageUrl: "/xray-0.png" }], documents });
  });
  it("packs several X-rays on continuation pages in their saved order", () => {
    const images = xrays(7).reverse();
    const pages = buildTreatmentReportPages({ ...base, xrays: images });
    expect(pages).toHaveLength(3);
    expect(pages.map(page => page.xrays?.length)).toEqual([1, 3, 3]);
    expect(pages.flatMap(page => page.xrays ?? []).map(image => image.imageUrl)).toEqual(xrays(7).map(image => image.url));
    expect(images[0].id).toBe("xray-6");
    expect(pages.every(page => page.kind !== "xray")).toBe(true);
  });
  it("keeps document text complete after images across all supported paper sizes", () => {
    const body = "Follow these aftercare instructions carefully.\n".repeat(100);
    for (const size of ["A4", "Letter", "Legal"] as const) {
      const pages = buildTreatmentReportPages({ ...base, xrays: xrays(4) }, settings(size), [{ title: "Aftercare", body }]);
      expect(pages.flatMap(page => page.xrays ?? [])).toHaveLength(4);
      expect(pages.flatMap(page => page.documents ?? []).map(doc => doc.body).join("")).toBe(body);
      const lastImage = pages.reduce((last, page, index) => page.xrays?.length ? index : last, -1);
      expect(pages.findIndex(page => page.documents?.length)).toBeGreaterThanOrEqual(lastImage);
    }
  });
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
  const planWithItems = (count: number): TreatmentPlan => ({ ...base, treatments: [{ id: "visit", kind: "visit", items: Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Metal-Ceramic Crown ${i}`, toothNumber: 12, amount: 1, unitPrice: 200 })) }] });
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
  it("does not split one package tooth group across report pages", () => {
    const plan = planWithItems(10);
    const visit = plan.treatments![0];
    if (visit.kind !== "visit") throw new Error("Expected visit");
    visit.items.push(...[11, 12, 13, 14, 21, 22, 23, 24].map(toothNumber => ({
      id: `package-${toothNumber}`, toothNumber, name: "Veneer package", amount: 1, unitPrice: 500, priceMode: "package" as const,
    })));
    const fragments = buildTreatmentReportPages(plan, settings("Letter")).map(page => (page.treatmentRows ?? []).flatMap(row => row.kind === "visit" ? row.items.filter(item => item.priceMode === "package") : []));
    expect(fragments.filter(items => items.length).map(items => items.length)).toEqual([8]);
  });
});
