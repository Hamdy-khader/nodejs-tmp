import type { TreatmentPlan, TreatmentRow } from "./patients-store";
import type { TreatmentPlanPdfPage } from "./treatment-plan-pdf";
import type { PlanSettings, PageSize } from "./plan-settings-store";
import { groupTreatmentItems } from "./treatment-groups";

export const REPORT_XRAY_HEIGHT = 180;
// Image plus caption and vertical spacing; shared with the report renderer.
export const REPORT_XRAY_BLOCK_HEIGHT = REPORT_XRAY_HEIGHT + 36;

export function reportPageHeight(size: PageSize = "A4") {
  return size === "Letter" ? 770 : size === "Legal" ? 980 : 842;
}

// A table shrunk by "Fit to page" stays readable down to this scale; a longer
// one runs over several pages instead.
export const MIN_FIT_SCALE = 0.6;
// The compact two-jaw chart needs at most 200px at the report's 527px content width.
const CHART_HEIGHT = 200;

/** The price-table options of a report, with the defaults for older settings. */
export function reportTableOptions(settings?: PlanSettings) {
  const prices = settings?.pricePage;
  return {
    showJaws: prices?.showJaws ?? false,
    showVisits: prices?.showVisits ?? true,
    fitToPage: prices?.fitToPage ?? true,
    showChart: settings?.planSections.showPlanChart ?? true,
    pageBreaks: settings?.planSections.pageBreaks ?? true,
  };
}

/** The visit rows a report lists: as planned, or one table when visits are hidden. */
export function reportRows(plan: TreatmentPlan, showVisits: boolean): TreatmentRow[] {
  const rows = plan.treatments ?? [];
  if (showVisits) return rows;
  const items = rows.flatMap((row) => (row.kind === "visit" ? row.items : []));
  return [
    { id: "all-treatments", kind: "visit", items },
    ...rows.filter((row) => row.kind === "discount"),
  ];
}

// Reserve space for page headers, footers, and totals. Visit items remain atomic.
export function buildTreatmentReportPages(plan: TreatmentPlan, settings?: PlanSettings, documents: Array<{ title: string; body?: string }> = []): TreatmentPlanPdfPage[] {
  const pages: TreatmentPlanPdfPage[] = [];
  const options = reportTableOptions(settings);
  let rows: TreatmentRow[] = [];
  // Match the report's 48px vertical padding, 46px header and 78px footer.
  const contentHeight = reportPageHeight(settings?.pageSize) - 48 - 46 - (settings?.pageDesign.innerPages.showFooter === false ? 0 : 78);
  const firstPageSpace = contentHeight - (options.showChart ? CHART_HEIGHT : 0);
  let available = firstPageSpace;
  let first = true;
  let scale = 1;
  const flush = () => {
    pages.push({
      kind: "suggested",
      title: "Your suggested treatment",
      treatmentRows: rows,
      showTreatmentChart: first && options.showChart,
      ...(scale < 1 && { fitScale: scale }),
    });
    rows = [];
    first = false;
    available = contentHeight;
  };
  const textHeight = (text: string | undefined, width = 50) =>
    Math.max(1, Math.ceil((text?.length ?? 0) / width), text?.split("\n").length ?? 0) * 13;
  const headerHeight = (row: Extract<TreatmentRow, { kind: "visit" }>, withNote: boolean) =>
    options.showVisits
      ? 50 + textHeight(row.label) + (withNote && row.note ? 8 + textHeight(row.note, 95) : 0)
      : 30;
  const groupHeight = (group: ReturnType<typeof groupTreatmentItems>[number]) =>
    Math.max(19 + textHeight(`${group.items[0].name}${group.jaw ? ` — ${group.jaw}` : ""}${group.teeth.length ? ` (${group.teeth.join(", ")})` : ""}`, 55), group.priceMode === "package" ? 58 : 0);
  const otherHeight = (row: Exclude<TreatmentRow, { kind: "visit" }>) =>
    25 + textHeight(row.kind === "healing" ? `Healing period: ${row.label ?? ""} ${row.days ?? ""} days` : "Discount", 95) + (row.note ? textHeight(row.note, 95) : 0);
  const groupsOf = (row: Extract<TreatmentRow, { kind: "visit" }>) =>
    groupTreatmentItems(row.items, row.items, { splitJaws: options.showJaws });

  const source = reportRows(plan, options.showVisits);
  const prices = settings?.pricePage;
  const hasDiscount = (plan.treatments ?? []).some(row => row.kind === "discount" && row.value > 0);
  const totalLines = prices?.showTotal === false ? 0 :
    hasDiscount ? 1 + Number(prices?.showSubtotal !== false) + Number(prices?.showDiscount !== false) : 1;
  const totalsHeight = 18 + totalLines * 30 + (plan.treatmentNote ? 12 + textHeight(plan.treatmentNote, 95) : 0);

  // "Fit to page": when the whole table is a little too long, shrink it onto the
  // first page rather than starting a second one.
  const needed = source.reduce((sum, row) => sum + (row.kind === "visit"
    ? headerHeight(row, true) + groupsOf(row).reduce((rowSum, group) => rowSum + groupHeight(group), 0)
    : otherHeight(row)), 0) + totalsHeight;
  if (options.fitToPage && needed > firstPageSpace && firstPageSpace / needed >= MIN_FIT_SCALE) {
    scale = firstPageSpace / needed;
    available = Infinity;
  }

  for (const row of source) {
    if (row.kind !== "visit") {
      const height = otherHeight(row);
      if (available < height) flush();
      rows.push(row);
      available -= height;
      continue;
    }
    let fragment: Extract<TreatmentRow, { kind: "visit" }> = { ...row, items: [] };
    let header = headerHeight(row, true);
    const addHeader = () => {
      if (available < header + 30) flush();
      rows.push(fragment);
      available -= header;
    };
    addHeader();
    for (const group of groupsOf(row)) {
      const height = groupHeight(group);
      if (available < height) {
        flush();
        fragment = { ...row, note: undefined, items: [] };
        header = headerHeight(row, false);
        addHeader();
      }
      fragment.items.push(...group.items);
      available -= height;
    }
  }
  if (available < totalsHeight) flush();
  const remainingAfterTreatments = scale < 1 ? 0 : available - totalsHeight;
  flush();
  pages[pages.length - 1].showTotals = true;
  // Images and document text share the free space below the final treatment
  // totals, unless "Page breaks" starts them on a page of their own.
  available = options.pageBreaks ? 0 : remainingAfterTreatments;
  let page = pages[pages.length - 1];
  const nextContentPage = () => {
    page = { kind: "document", title: "Documents", documents: [] };
    pages.push(page);
    available = contentHeight;
  };
  for (const [index, xray] of [...(plan.xrays ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).entries()) {
    if (available < REPORT_XRAY_BLOCK_HEIGHT) nextContentPage();
    (page.xrays ??= []).push({ title: `X-ray ${index + 1}`, imageUrl: xray.url });
    available -= REPORT_XRAY_BLOCK_HEIGHT;
  }
  for (const document of documents) {
    let body = document.body ?? "";
    let title = document.title;
    do {
      const headingHeight = title ? 28 + Math.ceil(title.length / 60) * 18 : 0;
      if (available < headingHeight + 30) nextContentPage();
      const maxLines = Math.max(1, Math.floor((available - headingHeight) / 15));
      let end = 0;
      let lines = 0;
      while (end < body.length && lines < maxLines) {
        const newline = body.indexOf("\n", end);
        let lineEnd = Math.min(end + 75, body.length);
        if (newline >= end && newline < lineEnd) lineEnd = newline + 1;
        else if (lineEnd < body.length) {
          const space = body.lastIndexOf(" ", lineEnd - 1);
          if (space >= end) lineEnd = space + 1;
        }
        end = lineEnd;
        lines += 1;
      }
      (page.documents ??= []).push({ title, body: body.slice(0, end) });
      available -= headingHeight + Math.max(1, lines) * 15;
      body = body.slice(end);
      title = "";
      if (body) nextContentPage();
    } while (body);
  }
  return pages;
}
