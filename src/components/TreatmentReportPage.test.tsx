import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultTeeth, type TreatmentPlan } from "@/lib/patients-store";
import type { PlanSettings } from "@/lib/plan-settings-store";
import { buildTreatmentReportPages } from "@/lib/treatment-report-layout";
import type { TreatmentPlanPdfPage } from "@/lib/treatment-plan-pdf";
import { TreatmentReportPage } from "./TreatmentReportPage";

type Options = Partial<PlanSettings["pricePage"]>;
const withOptions = (options: Options = {}): PlanSettings => ({
  language: "English", pageSize: "A4", priceListDesign: "detailed", updatedAt: 0,
  pricePage: {
    showPrices: true, showSubtotal: true, showTotal: true, showDiscount: true, showTax: false, showInsurance: false, currency: "EUR",
    showJaws: true, showVisits: true, showAmount: true, showUnitPrice: true, showPrice: true, fitToPage: false,
    ...options,
  },
  planSections: { showDiagnosis: true, showTreatments: true, showDocuments: true, showOverview: true, showPlanChart: true, pageBreaks: false },
  pageDesign: { frontCover: { clinicName: "Clinic", title: "Plan" }, innerPages: { headerText: "", footerLeft: "Clinic", footerRight: "", showFooter: true }, backCover: { title: "" } },
});
const settings = withOptions();

function renderPage(page: TreatmentPlanPdfPage, plan: TreatmentPlan, index = 0, total = 1, options = settings) {
  const html = renderToStaticMarkup(<TreatmentReportPage page={page} index={index} total={total}
    plan={plan} settings={options} pageRef={createRef<HTMLDivElement>()}
    exportContext={{ clinicName: "Clinic", patientName: "Patient", treatmentNumber: "1" }} />);
  return new DOMParser().parseFromString(html, "text/html");
}

function report(plan: TreatmentPlan, options = settings) {
  const pages = buildTreatmentReportPages(plan, options);
  return pages.map((page, index) => renderPage(page, plan, index, pages.length, options));
}

const marker = (page: Document, tooth: number) =>
  page.querySelector(`[data-tooth-number="${tooth}"] [data-marker]`)?.getAttribute("data-marker");

describe("treatment report charts", () => {
  const base: TreatmentPlan = { id: "plan", patientId: "patient", name: "Plan", notes: "", teeth: defaultTeeth(), createdAt: 0, updatedAt: 0 };
  it("draws the diagnosis as a read-only chart on the status page", () => {
    const plan: TreatmentPlan = { ...base, teeth: { ...base.teeth, 16: { number: 16, status: "intact", statuses: [{ toothId: 16, stateId: 201 }] } } };
    const page = renderPage({ kind: "status", title: "Your current dental status" }, plan);
    expect(page.querySelector('[data-odontogram="diagnosis"]')?.getAttribute("role")).toBe("img");
    expect(page.querySelectorAll("button")).toHaveLength(0);
    expect(marker(page, 16)).toBe("status");
    expect(marker(page, 15)).toBe("none");
  });
  it("marks the planned treatments on the first treatment page", () => {
    const plan: TreatmentPlan = { ...base, treatments: [{ id: "visit", kind: "visit", items: [
      { id: "a", name: "Zirconium Crown", toothNumber: 16, amount: 1, unitPrice: 700, catalogSectionKey: "crown", catalogGroupKey: "crown", catalogItemKey: "zirconium-crown" },
    ] }] };
    const [page] = report(plan);
    expect(page.querySelector('[data-odontogram="treatments"]')?.getAttribute("role")).toBe("img");
    expect(page.querySelectorAll("button")).toHaveLength(0);
    expect(marker(page, 16)).toBe("planned");
    expect(marker(page, 15)).toBe("none");
  });
});

describe("treatment report jaw rows", () => {
  const base: TreatmentPlan = { id: "plan", patientId: "patient", name: "Plan", notes: "", teeth: defaultTeeth(), createdAt: 0, updatedAt: 0 };
  it("renders a separate row per jaw for each visit", () => {
    const plan: TreatmentPlan = { ...base, treatments: ["First stage", "Second stage"].map((label, index) => ({
      id: String(index), kind: "visit", label,
      items: [11, 21, 31, 41].map(number => ({ id: `${index}-${number}`, name: "Ceramic bridge on implant", toothNumber: number, amount: 1, unitPrice: 265 })),
    })) };
    const rows = report(plan).flatMap(page => [...page.querySelectorAll("tbody tr")]);
    expect(rows).toHaveLength(4);
    expect(rows.map(row => row.children[0].textContent)).toEqual([
      "Ceramic bridge on implant — Upper jaw (11, 21)", "Ceramic bridge on implant — Lower jaw (31, 41)",
      "Ceramic bridge on implant — Upper jaw (11, 21)", "Ceramic bridge on implant — Lower jaw (31, 41)",
    ]);
    expect(rows.map(row => row.children[3].textContent)).toEqual(Array(4).fill("€ 530"));
  });
  it("does not charge a shared package again when the lower jaw continues on another page", () => {
    const plan: TreatmentPlan = { ...base, treatments: [{ id: "visit", kind: "visit", items: [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `filler-${i}`, name: `Filling ${i}`, amount: 1, unitPrice: 10 })),
      ...[11, 21, 31, 41].map(number => ({ id: String(number), name: "Ceramic bridge on implant", toothNumber: number, amount: 1, unitPrice: 500, priceMode: "package" as const })),
    ] }] };
    const pages = report(plan);
    const packageRows = pages.map(page => [...page.querySelectorAll("tbody tr")].filter(row => row.textContent?.includes("Ceramic bridge on implant")));
    expect(packageRows.filter(rows => rows.length).map(rows => rows.length)).toEqual([1, 1]);
    expect(packageRows.flat().map(row => row.children[3].textContent)).toEqual(["€ 500", "In package"]);
    expect(pages.at(-1)!.body.textContent).toContain("€ 600");
  });
});

describe("treatment report price table options", () => {
  const base: TreatmentPlan = { id: "plan", patientId: "patient", name: "Plan", notes: "", teeth: defaultTeeth(), createdAt: 0, updatedAt: 0 };
  const bridge = (prefix: string) => [11, 21, 31, 41].map(number => ({ id: `${prefix}-${number}`, name: "Ceramic bridge on implant", toothNumber: number, amount: 1, unitPrice: 265 }));
  const twoVisits: TreatmentPlan = { ...base, treatments: [
    { id: "a", kind: "visit", label: "First stage", items: bridge("a") },
    { id: "b", kind: "visit", label: "Second stage", items: [{ id: "b-16", name: "Filling", toothNumber: 16, amount: 1, unitPrice: 100 }] },
  ] };
  const firstColumns = (page: Document) => [...page.querySelectorAll("tbody tr")].map(row => row.children[0].textContent);

  it("keeps both jaws on one row when Prices / jaws is off", () => {
    const [page] = report(twoVisits, withOptions({ showJaws: false }));
    expect(firstColumns(page)).toEqual(["Ceramic bridge on implant (11, 21, 31, 41)", "Filling (16)"]);
  });

  it("charges a package once when its row continues on another page without jaw rows", () => {
    const plan: TreatmentPlan = { ...base, treatments: [{ id: "visit", kind: "visit", items: [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `filler-${i}`, name: `Filling ${i}`, amount: 1, unitPrice: 10 })),
      ...[11, 21, 31, 41].map(number => ({ id: String(number), name: "Ceramic bridge on implant", toothNumber: number, amount: 1, unitPrice: 500, priceMode: "package" as const })),
    ] }] };
    const pages = report(plan, withOptions({ showJaws: false }));
    const packageRows = pages.flatMap(page => [...page.querySelectorAll("tbody tr")].filter(row => row.textContent?.includes("Ceramic bridge on implant")));
    expect(packageRows.map(row => row.children[3].textContent).filter(price => price !== "In package")).toEqual(["€ 500"]);
    expect(pages.at(-1)!.body.textContent).toContain("€ 600");
  });

  it("hides the columns that are switched off", () => {
    const [page] = report(twoVisits, withOptions({ showAmount: false, showUnitPrice: false }));
    expect([...page.querySelector("thead")!.querySelectorAll("th")].map(cell => cell.textContent)).toEqual(["Treatment", "Price"]);
    expect([...page.querySelectorAll("tbody tr")][0].children).toHaveLength(2);
  });

  it("lists all treatments in one table without visit headers when Procedure is off", () => {
    const [page] = report(twoVisits, withOptions({ showVisits: false }));
    expect(page.body.textContent).not.toContain("Visit:");
    expect(page.querySelectorAll("table")).toHaveLength(1);
    expect(firstColumns(page)).toHaveLength(3);
  });

  it("shows one Total line without a discount and hides it when Total is off", () => {
    const totalLines = (page: Document) => [...page.querySelectorAll("div")]
      .filter(div => div.children.length === 2 && [...div.children].every(child => child.tagName === "SPAN"))
      .map(div => div.textContent)
      .filter(text => /^(Total|Discount|Discounted price)€/.test(text ?? ""));
    const [withTotal] = report(twoVisits);
    expect(totalLines(withTotal)).toEqual(["Total€ 1,160"]);
    const [withoutTotal] = report(twoVisits, withOptions({ showTotal: false }));
    expect(totalLines(withoutTotal)).toEqual([]);
  });
});
