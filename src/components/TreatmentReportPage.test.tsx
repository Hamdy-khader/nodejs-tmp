import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { defaultTeeth, type TreatmentPlan } from "@/lib/patients-store";
import type { PlanSettings } from "@/lib/plan-settings-store";
import { buildTreatmentReportPages } from "@/lib/treatment-report-layout";
import { TreatmentReportPage } from "./TreatmentReportPage";

vi.mock("./TeethChart", () => ({ TeethChart: () => null }));

const settings: PlanSettings = {
  language: "English", pageSize: "A4", priceListDesign: "detailed", updatedAt: 0,
  pricePage: { showPrices: true, showSubtotal: true, showTotal: true, showDiscount: true, showTax: false, showInsurance: false, currency: "EUR" },
  planSections: { showDiagnosis: true, showTreatments: true, showDocuments: true, showOverview: true },
  pageDesign: { frontCover: { clinicName: "Clinic", title: "Plan" }, innerPages: { headerText: "", footerLeft: "Clinic", footerRight: "", showFooter: true }, backCover: { title: "" } },
};

function report(plan: TreatmentPlan) {
  const pages = buildTreatmentReportPages(plan, settings);
  return pages.map((page, index) => {
    const html = renderToStaticMarkup(<TreatmentReportPage page={page} index={index} total={pages.length}
      plan={plan} settings={settings} pageRef={createRef<HTMLDivElement>()}
      exportContext={{ clinicName: "Clinic", patientName: "Patient", treatmentNumber: "1" }} />);
    return new DOMParser().parseFromString(html, "text/html");
  });
}

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
