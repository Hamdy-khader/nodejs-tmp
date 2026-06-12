import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { PlanSettings } from "@/lib/plan-settings-store";

export interface TreatmentPlanPdfPage {
  kind: "cover" | "status" | "suggested" | "document" | "back";
  title: string;
  body?: string;
}

export async function saveTreatmentPlanPdf(args: {
  fileName: string;
  pageElements: Array<HTMLElement | null>;
  settings: PlanSettings;
}) {
  const { fileName, pageElements, settings } = args;
  const pages = pageElements.filter((element): element is HTMLElement => Boolean(element));
  if (pages.length === 0) {
    throw new Error("No overview pages available to export.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: settings.pageSize.toLowerCase(),
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let index = 0; index < pages.length; index += 1) {
    const canvas = await html2canvas(pages[index], {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    const imageData = canvas.toDataURL("image/png");

    if (index > 0) pdf.addPage();
    pdf.addImage(imageData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  }

  pdf.save(fileName);
}
