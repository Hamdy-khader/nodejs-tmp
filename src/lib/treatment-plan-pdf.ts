import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { PlanSettings } from "@/lib/plan-settings-store";

export interface TreatmentPlanPdfPage {
  kind: "cover" | "status" | "suggested" | "document" | "back";
  title: string;
  body?: string;
}

const STYLE_PROPS = [
  "color",
  "background",
  "backgroundColor",
  "backgroundImage",
  "border",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRadius",
  "boxShadow",
  "textShadow",
  "outline",
  "outlineColor",
  "fill",
  "stroke",
  "opacity",
  "font",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textAlign",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "margin",
  "padding",
  "gap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
  "flex",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "alignSelf",
  "placeItems",
  "aspectRatio",
  "transform",
  "transformOrigin",
  "overflow",
  "overflowX",
  "overflowY",
  "visibility",
  "zIndex",
] as const;

function inlineComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const targetStyle = (target as HTMLElement | SVGElement).style;

  for (const prop of STYLE_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    if (value.includes("oklch(")) continue;
    targetStyle.setProperty(prop, value);
  }

  if (target instanceof HTMLElement) {
    target.className = "";
  } else {
    target.removeAttribute("class");
  }

  target.removeAttribute("data-slot");
  target.removeAttribute("style");
  for (const prop of STYLE_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    if (value.includes("oklch(")) continue;
    targetStyle.setProperty(prop, value);
  }
}

function inlineTreeStyles(source: Node, target: Node) {
  if (source.nodeType === Node.ELEMENT_NODE && target.nodeType === Node.ELEMENT_NODE) {
    inlineComputedStyles(source as Element, target as Element);
  }

  const sourceChildren = Array.from(source.childNodes);
  const targetChildren = Array.from(target.childNodes);
  const count = Math.min(sourceChildren.length, targetChildren.length);

  for (let index = 0; index < count; index += 1) {
    inlineTreeStyles(sourceChildren[index], targetChildren[index]);
  }
}

function createExportClone(page: HTMLElement) {
  const clone = page.cloneNode(true) as HTMLElement;
  inlineTreeStyles(page, clone);

  clone.style.position = "fixed";
  clone.style.left = "-20000px";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.zIndex = "-1";
  clone.style.pointerEvents = "none";
  clone.style.backgroundColor = "#ffffff";
  clone.style.isolation = "isolate";

  document.body.appendChild(clone);
  return clone;
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
    const exportPage = createExportClone(pages[index]);
    try {
      const canvas = await html2canvas(exportPage, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const imageData = canvas.toDataURL("image/png");

      if (index > 0) pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    } finally {
      exportPage.remove();
    }
  }

  pdf.save(fileName);
}
