import { jsPDF } from "jspdf";
import type { PlanSettings } from "@/lib/plan-settings-store";

export interface TreatmentPlanPdfPage {
  kind: "cover" | "status" | "suggested" | "document" | "back";
  title: string;
  body?: string;
}

function drawInnerChrome(
  pdf: jsPDF,
  settings: PlanSettings,
  pageNumber: number,
  totalPages: number,
) {
  const { innerPages } = settings.pageDesign;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setDrawColor(220, 220, 220);
  pdf.line(56, 42, pageWidth - 56, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(innerPages.headerText || "Inner pages", 56, 34);

  if (!innerPages.showFooter) return;

  pdf.line(56, pageHeight - 38, pageWidth - 56, pageHeight - 38);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(innerPages.footerLeft || "", 56, pageHeight - 24);
  pdf.text(`${pageNumber} / ${totalPages}`, pageWidth / 2, pageHeight - 24, { align: "center" });
  pdf.text(innerPages.footerRight || "", pageWidth - 56, pageHeight - 24, { align: "right" });
}

function drawCover(pdf: jsPDF, settings: PlanSettings) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { frontCover } = settings.pageDesign;

  pdf.setFillColor(48, 37, 22);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFillColor(228, 223, 210);
  pdf.rect(0, 130, pageWidth, pageHeight - 260, "F");

  pdf.setTextColor(233, 198, 112);
  pdf.setFont("times", "italic");
  pdf.setFontSize(24);
  pdf.text(frontCover.clinicName || "Treatly", pageWidth / 2, 80, { align: "center" });

  pdf.setTextColor(90, 72, 45);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(frontCover.title || "TREATMENT PLAN", pageWidth / 2, pageHeight / 2 - 10, {
    align: "center",
  });

  if (frontCover.subtitle) {
    pdf.setFont("times", "italic");
    pdf.setFontSize(18);
    pdf.text(frontCover.subtitle, pageWidth / 2, pageHeight / 2 + 22, { align: "center" });
  }
}

function drawBackCover(pdf: jsPDF, settings: PlanSettings) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { backCover } = settings.pageDesign;

  pdf.setFillColor(248, 245, 239);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setTextColor(82, 66, 41);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(backCover.title || "Back cover", pageWidth / 2, pageHeight / 2 - 20, { align: "center" });

  if (backCover.note) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    const lines = pdf.splitTextToSize(backCover.note, pageWidth - 120);
    pdf.text(lines, pageWidth / 2, pageHeight / 2 + 20, { align: "center" });
  }
}

function drawBodyPage(pdf: jsPDF, page: TreatmentPlanPdfPage) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;

  pdf.setTextColor(28, 28, 28);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(page.title, margin, 84);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const paragraphs = (page.body || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  let y = 112;
  paragraphs.forEach((paragraph) => {
    const lines = pdf.splitTextToSize(paragraph, contentWidth);
    const blockHeight = lines.length * 15;

    if (y + blockHeight > pageHeight - 70) {
      return;
    }

    pdf.text(lines, margin, y);
    y += blockHeight + 10;
  });
}

export function saveTreatmentPlanPdf(args: {
  fileName: string;
  pages: TreatmentPlanPdfPage[];
  settings: PlanSettings;
}) {
  const { fileName, pages, settings } = args;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: settings.pageSize.toLowerCase(),
  });

  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage();

    if (page.kind === "cover") {
      drawCover(pdf, settings);
      return;
    }

    if (page.kind === "back") {
      drawBackCover(pdf, settings);
      return;
    }

    drawInnerChrome(pdf, settings, index + 1, pages.length);
    drawBodyPage(pdf, page);
  });

  pdf.save(fileName);
}
