import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultTeeth, type TreatmentPlan } from "@/lib/patients-store";
import type { PlanSettings } from "@/lib/plan-settings-store";
import { buildTreatmentReportPages } from "@/lib/treatment-report-layout";
import type { TreatmentPlanPdfPage } from "@/lib/treatment-plan-pdf";
import { TreatmentReportPage } from "./TreatmentReportPage";

const settings: PlanSettings = {
  language: "English", pageSize: "A4", priceListDesign: "detailed", updatedAt: 0,
  pricePage: { showPrices: true, showSubtotal: true, showTotal: true, showDiscount: true, showTax: false, showInsurance: false, currency: "EUR" },
  planSections: { showDiagnosis: true, showTreatments: true, showDocuments: true, showOverview: true },
  pageDesign: { frontCover: { clinicName: "Clinic", title: "Plan" }, innerPages: { headerText: "", footerLeft: "Clinic", footerRight: "", showFooter: true }, backCover: { title: "" } },
};

function renderPage(page: TreatmentPlanPdfPage, plan: TreatmentPlan, index = 0, total = 1) {
  const html = renderToStaticMarkup(<TreatmentReportPage page={page} index={index} total={total}
    plan={plan} settings={settings} pageRef={createRef<HTMLDivElement>()}
    exportContext={{ clinicName: "Clinic", patientName: "Patient", treatmentNumber: "1" }} />);
  return new DOMParser().parseFromString(html, "text/html");
}

function report(plan: TreatmentPlan) {
  const pages = buildTreatmentReportPages(plan, settings);
  return pages.map((page, index) => renderPage(page, plan, index, pages.length));
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
