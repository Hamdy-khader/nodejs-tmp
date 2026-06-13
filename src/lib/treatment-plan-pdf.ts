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

// html2canvas cannot parse some newer CSS color functions.
// Chrome can return them verbatim from getComputedStyle, so we convert each
// occurrence to rgb() using the browser's own Canvas color parser.
const MODERN_COLOR_FN_NAMES = [
  ["ok", "lab"],
  ["ok", "lch"],
  ["lab"],
  ["lch"],
  ["color"],
]
  .map((parts) => parts.join(""))
  .join("|");

const MODERN_COLOR_RE = new RegExp(
  String.raw`\b(?:${MODERN_COLOR_FN_NAMES})\((?:[^()]+|\([^()]*\))*\)`,
  "gi",
);

let colorParseCtx: CanvasRenderingContext2D | null = null;

function colorToRgb(color: string): string | null {
  if (!colorParseCtx) {
    colorParseCtx = document.createElement("canvas").getContext("2d");
  }
  if (!colorParseCtx) return null;
  // Use a sentinel so we can detect when the canvas fails to parse the color.
  colorParseCtx.fillStyle = "#000000";
  colorParseCtx.fillStyle = color;
  const parsed = colorParseCtx.fillStyle;
  colorParseCtx.fillStyle = "#ffffff";
  colorParseCtx.fillStyle = color;
  // If parsing fails, fillStyle keeps the previous value, so the two probes differ.
  return parsed === colorParseCtx.fillStyle ? parsed : null;
}

function sanitizeColorValue(value: string): string {
  // MODERN_COLOR_RE is global, so reset lastIndex to keep test()/replace() stateless.
  MODERN_COLOR_RE.lastIndex = 0;
  if (!MODERN_COLOR_RE.test(value)) return value;
  MODERN_COLOR_RE.lastIndex = 0;
  return value.replace(MODERN_COLOR_RE, (match) => colorToRgb(match) ?? "rgb(0, 0, 0)");
}

function inlineComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const targetStyle = (target as HTMLElement | SVGElement).style;

  if (target instanceof HTMLElement) {
    target.className = "";
  } else {
    target.removeAttribute("class");
  }
  target.removeAttribute("data-slot");
  target.removeAttribute("style");

  // Inline the curated structural/visual props so the declassed clone keeps its layout.
  for (const prop of STYLE_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    targetStyle.setProperty(prop, sanitizeColorValue(value));
  }

  // Scan EVERY computed property (including --tw-* custom properties, accent-color,
  // caret-color, text-decoration-color, etc.). Any value still carrying a modern
  // color function would crash html2canvas, so override it with the rgb equivalent.
  for (let i = 0; i < computed.length; i += 1) {
    const prop = computed.item(i);
    if (!prop) continue;
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    const sanitized = sanitizeColorValue(value);
    if (sanitized !== value) targetStyle.setProperty(prop, sanitized);
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

function removeUnsupportedExportNodes(root: HTMLElement) {
  const unsupportedSelectors = [
    "svg",
    "symbol",
    "defs",
    "clipPath",
    "mask",
    "pattern",
    "marker",
    "filter",
    "foreignObject",
  ].join(", ");

  root.querySelectorAll(unsupportedSelectors).forEach((node) => {
    node.remove();
  });
}

function forceLegacyColorStyles(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    const style = element.style;
    for (let index = 0; index < style.length; index += 1) {
      const prop = style.item(index);
      if (!prop) continue;
      const value = style.getPropertyValue(prop);
      if (!value) continue;
      const sanitized = sanitizeColorValue(value);
      if (sanitized !== value) {
        style.setProperty(prop, sanitized, style.getPropertyPriority(prop));
      }
    }
  });
}

function createExportClone(page: HTMLElement) {
  const clone = page.cloneNode(true) as HTMLElement;
  inlineTreeStyles(page, clone);
  removeUnsupportedExportNodes(clone);
  forceLegacyColorStyles(clone);

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
