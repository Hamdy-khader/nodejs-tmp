import { describe, expect, it } from "vitest";
import { buildTreatmentReportPages, MIN_FIT_SCALE, reportRows } from "./treatment-report-layout";
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
type Options = Partial<PlanSettings["pricePage"]> & Partial<PlanSettings["planSections"]>;
// Report settings for the tests: jaw rows, no fitting and documents flowing under
// the totals unless a test turns an option on.
const settings = (pageSize: PlanSettings["pageSize"] = "A4", options: Options = {}): PlanSettings => ({
  language: "English", pageSize, priceListDesign: "detailed", updatedAt: 0,
  pricePage: {
    showPrices: true, showSubtotal: true, showTotal: options.showTotal ?? true, showDiscount: true, showTax: false, showInsurance: false, currency: "EUR",
    showJaws: options.showJaws ?? true, showVisits: options.showVisits ?? true, showAmount: true, showUnitPrice: true, showPrice: true, fitToPage: options.fitToPage ?? false,
  },
  planSections: {
    showDiagnosis: true, showTreatments: true, showDocuments: true, showOverview: true,
    showPlanChart: options.showPlanChart ?? true, pageBreaks: options.pageBreaks ?? false,
  },
  pageDesign: { frontCover: { clinicName: "Clinic", title: "Plan" }, innerPages: { headerText: "", footerLeft: "Clinic", footerRight: "", showFooter: true }, backCover: { title: "" } },
});
describe("treatment report pagination", () => {
  const xrays = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `xray-${index}`, url: `/xray-${index}.png`, sortOrder: index }));
  it("shares one page between treatment totals, an X-ray and document text", () => {
    const documents = [{ title: "Aftercare", body: "Care instructions." }];
    const pages = buildTreatmentReportPages({ ...base, xrays: xrays(1) }, settings(), documents);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ showTotals: true, xrays: [{ title: "X-ray 1", imageUrl: "/xray-0.png" }], documents });
  });
  it("packs several X-rays on continuation pages in their saved order", () => {
    const images = xrays(7).reverse();
    const pages = buildTreatmentReportPages({ ...base, xrays: images }, settings());
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
    const pages = buildTreatmentReportPages(base, settings(), docs);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ kind: "suggested", showTotals: true, documents: docs });
  });
  it("fills remaining treatment space and continues text without losing or duplicating content", () => {
    const body = "Long aftercare instructions with detailed information.\n".repeat(100);
    const pages = buildTreatmentReportPages(base, settings(), [{ title: "Aftercare", body }, { title: "Next steps", body: "Review." }]);
    expect(pages[0].documents?.[0].body?.length).toBeGreaterThan(0);
    expect(pages.length).toBeGreaterThan(2);
    const fragments = pages.flatMap(page => page.documents ?? []);
    expect(fragments.slice(0, -1).map(doc => doc.body).join("")).toBe(body);
    expect(fragments.filter(doc => doc.title === "Aftercare")).toHaveLength(1);
    expect(fragments.at(-1)).toEqual({ title: "Next steps", body: "Review." });
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
  it("does not reserve the totals when Total is off", () => {
    const count = Array.from({ length: 40 }, (_, i) => i + 1).find(
      (n) => buildTreatmentReportPages(planWithItems(n), settings("A4")).length > 1,
    )!;
    expect(buildTreatmentReportPages(planWithItems(count), settings("A4", { showTotal: false }))).toHaveLength(1);
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
    const pages = buildTreatmentReportPages(plan, settings());
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

describe("report options", () => {
  const items = (count: number, name = "Crown") =>
    Array.from({ length: count }, (_, i) => ({ id: `${name}-${i}`, name: `${name} ${i}`, toothNumber: 12, amount: 1, unitPrice: 200 }));
  const plan = (...visits: number[]): TreatmentPlan => ({
    ...base,
    treatments: visits.map((count, index) => ({ id: `visit-${index}`, kind: "visit" as const, label: `Stage ${index + 1}`, items: items(count, `V${index}`) })),
  });

  it("lists every visit's treatments in one table when Procedure is off", () => {
    const withHealing: TreatmentPlan = {
      ...plan(2, 3),
      treatments: [
        ...plan(2, 3).treatments!,
        { id: "healing", kind: "healing", days: 90 },
        { id: "discount", kind: "discount", mode: "amount", value: 50 },
      ],
    };
    const rows = reportRows(withHealing, false);
    expect(rows.map((row) => row.kind)).toEqual(["visit", "discount"]);
    expect(rows[0].kind === "visit" && rows[0].items).toHaveLength(5);
    const pages = buildTreatmentReportPages(withHealing, settings("A4", { showVisits: false }));
    expect(pages[0].treatmentRows?.map((row) => row.kind)).toEqual(["visit", "discount"]);
  });

  it("leaves the chart out and gives its space to the table when Charts is off", () => {
    const count = Array.from({ length: 40 }, (_, i) => i + 1).find(
      (n) => buildTreatmentReportPages(plan(n), settings()).length > 1,
    )!;
    const pages = buildTreatmentReportPages(plan(count), settings("A4", { showPlanChart: false }));
    expect(pages).toHaveLength(1);
    expect(pages[0].showTreatmentChart).toBe(false);
  });

  it("shrinks a slightly long table onto the first page with Fit to page", () => {
    const count = Array.from({ length: 40 }, (_, i) => i + 1).find(
      (n) => buildTreatmentReportPages(plan(n), settings()).length > 1,
    )!;
    const pages = buildTreatmentReportPages(plan(count), settings("A4", { fitToPage: true }));
    expect(pages).toHaveLength(1);
    expect(pages[0].fitScale).toBeGreaterThanOrEqual(MIN_FIT_SCALE);
    expect(pages[0].fitScale).toBeLessThan(1);
    expect(pages[0].treatmentRows?.flatMap((row) => (row.kind === "visit" ? row.items : []))).toHaveLength(count);
  });

  it("runs a very long table over several pages instead of shrinking it too far", () => {
    const pages = buildTreatmentReportPages(plan(80), settings("A4", { fitToPage: true }));
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.fitScale === undefined)).toBe(true);
  });

  it("starts X-rays and documents on a new page with Page breaks", () => {
    const docs = [{ title: "Aftercare", body: "Care instructions." }];
    const pages = buildTreatmentReportPages(base, settings("A4", { pageBreaks: true }), docs);
    expect(pages.map((page) => page.kind)).toEqual(["suggested", "document"]);
    expect(pages[0].documents).toBeUndefined();
    expect(pages[1].documents).toEqual(docs);
  });
});
