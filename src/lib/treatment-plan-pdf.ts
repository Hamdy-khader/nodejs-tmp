import type { TreatmentRow } from "./patients-store";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import type { PlanSettings } from "@/lib/plan-settings-store";

export interface TreatmentPlanPdfPage {
  kind: "cover" | "status" | "suggested" | "document" | "back" | "xray";
  title: string;
  body?: string;
  documents?: Array<{ title: string; body?: string }>;
  imageUrl?: string;
  treatmentRows?: TreatmentRow[];
  showTreatmentChart?: boolean;
  showTotals?: boolean;
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
  let outputPages = 0;

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    await Promise.all(
      Array.from(page.querySelectorAll("img")).map(async (img) => {
        if (typeof img.decode === "function") await img.decode();
      }),
    );
    let blockBounds: Array<{ top: number; bottom: number }> = [];
    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (_document, element) => {
        // Export at a stable physical width regardless of the preview's grid layout.
        element.style.transform = "none";
        element.style.width = `${pdfWidth}px`;
        element.style.minHeight = `${pdfHeight}px`;
        element.style.maxWidth = "none";
        element.style.alignSelf = "start";
        element.style.height = ["cover", "xray", "back"].includes(element.dataset.pageKind ?? "")
          ? `${pdfHeight}px`
          : "auto";
        const pageTop = element.getBoundingClientRect().top;
        blockBounds = Array.from(element.querySelectorAll("[data-pdf-keep-together]")).map(
          (block) => {
            const rect = block.getBoundingClientRect();
            return { top: rect.top - pageTop, bottom: rect.bottom - pageTop };
          },
        );
        // Text documents flow across pages; keep each rendered line intact.
        if (["document", "suggested"].includes(element.dataset.pageKind ?? "")) {
          const main = element.querySelector("main");
          if (main) {
            const walker = _document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
            const range = _document.createRange();
            while (walker.nextNode()) {
              range.selectNodeContents(walker.currentNode);
              for (const rect of Array.from(range.getClientRects())) {
                blockBounds.push({ top: rect.top - pageTop, bottom: rect.bottom - pageTop });
              }
            }
          }
        }
      },
    });
    const pixelsPerPage = Math.floor((canvas.width * pdfHeight) / pdfWidth);
    const scale = canvas.width / pdfWidth;
    const blocks = blockBounds.map((block) => ({
      top: Math.floor(block.top * scale),
      bottom: Math.ceil(block.bottom * scale),
    }));
    for (let offset = 0; offset < canvas.height; ) {
      let end = Math.min(offset + pixelsPerPage, canvas.height);
      for (const block of blocks) {
        if (
          block.top > offset &&
          block.top < end &&
          block.bottom > end &&
          block.bottom - block.top <= pixelsPerPage
        )
          end = block.top;
      }
      const height = end - offset;
      let imageData: string;
      if (offset === 0 && end === canvas.height) imageData = canvas.toDataURL("image/png");
      else {
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = height;
        const context = slice.getContext("2d");
        if (!context) throw new Error("Could not render PDF page.");
        context.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
        imageData = slice.toDataURL("image/png");
      }
      if (outputPages++ > 0) pdf.addPage();
      pdf.addImage(
        imageData,
        "PNG",
        0,
        0,
        pdfWidth,
        (height * pdfWidth) / canvas.width,
        undefined,
        "FAST",
      );
      offset = end;
    }
  }

  pdf.save(fileName);
}
