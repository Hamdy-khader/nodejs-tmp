import type { TreatmentPlan, TreatmentRow } from "./patients-store";
import type { TreatmentPlanPdfPage } from "./treatment-plan-pdf";
import type { PlanSettings, PageSize } from "./plan-settings-store";

export function reportPageHeight(size: PageSize = "A4") {
  return size === "Letter" ? 770 : size === "Legal" ? 980 : 842;
}

// Reserve space for page headers, footers, and totals. Visit items remain atomic.
export function buildTreatmentReportPages(plan: TreatmentPlan, settings?: PlanSettings): TreatmentPlanPdfPage[] {
  const pages: TreatmentPlanPdfPage[] = [];
  let rows: TreatmentRow[] = [];
  // Match the report's 48px vertical padding, 46px header and 78px footer.
  // The compact two-jaw chart needs at most 200px at the report's 527px content width.
  const contentHeight = reportPageHeight(settings?.pageSize) - 48 - 46 - (settings?.pageDesign.innerPages.showFooter === false ? 0 : 78);
  let available = contentHeight - 200;
  let first = true;
  const flush = () => {
    pages.push({
      kind: "suggested",
      title: "Your suggested treatment",
      treatmentRows: rows,
      showTreatmentChart: first,
    });
    rows = [];
    first = false;
    available = contentHeight;
  };
  const textHeight = (text: string | undefined, width = 50) =>
    Math.max(1, Math.ceil((text?.length ?? 0) / width), text?.split("\n").length ?? 0) * 13;
  for (const row of plan.treatments ?? []) {
    if (row.kind !== "visit") {
      const label = row.kind === "healing" ? `Healing period: ${row.label ?? ""} ${row.days ?? ""} days` : "Discount";
      const height = 25 + textHeight(label, 95) + (row.note ? textHeight(row.note, 95) : 0);
      if (available < height) flush();
      rows.push(row);
      available -= height;
      continue;
    }
    let fragment: Extract<TreatmentRow, { kind: "visit" }> = { ...row, items: [] };
    let headerHeight = 50 + textHeight(row.label) + (row.note ? 8 + textHeight(row.note, 95) : 0);
    const addHeader = () => {
      if (available < headerHeight + 30) flush();
      rows.push(fragment);
      available -= headerHeight;
    };
    addHeader();
    for (const item of row.items) {
      const height = 19 + textHeight(`${item.name}${item.toothNumber == null ? "" : ` (${item.toothNumber})`}`, 55);
      if (available < height) {
        flush();
        fragment = { ...row, note: undefined, items: [] };
        headerHeight = 50 + textHeight(row.label);
        addHeader();
      }
      fragment.items.push(item);
      available -= height;
    }
  }
  const prices = settings?.pricePage;
  const hasDiscount = (plan.treatments ?? []).some(row => row.kind === "discount" && row.value > 0);
  const totalLines = prices?.showPrices === false ? 0 :
    Number(prices?.showSubtotal !== false) + Number(prices?.showTotal !== false) + Number(hasDiscount && prices?.showDiscount !== false);
  const totalsHeight = 18 + totalLines * 30 + (plan.treatmentNote ? 12 + textHeight(plan.treatmentNote, 95) : 0);
  if (available < totalsHeight) flush();
  flush();
  pages[pages.length - 1].showTotals = true;
  return pages;
}
