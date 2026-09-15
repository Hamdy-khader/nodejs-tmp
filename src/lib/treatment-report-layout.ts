import type { TreatmentPlan, TreatmentRow } from "./patients-store";
import type { TreatmentPlanPdfPage } from "./treatment-plan-pdf";

// Reserve space for page headers, footers, and totals. Visit items remain atomic.
export function buildTreatmentReportPages(plan: TreatmentPlan): TreatmentPlanPdfPage[] {
  const pages: TreatmentPlanPdfPage[] = [];
  let rows: TreatmentRow[] = [];
  let available = 340;
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
    available = 625;
  };
  const textHeight = (text: string | undefined, width = 50) =>
    Math.max(1, Math.ceil((text?.length ?? 0) / width), text?.split("\n").length ?? 0) * 13;
  for (const row of plan.treatments ?? []) {
    if (row.kind !== "visit") {
      const height = 24 + textHeight(row.note) + ("label" in row ? textHeight(row.label) : 0);
      if (available < height) flush();
      rows.push(row);
      available -= height;
      continue;
    }
    let fragment: Extract<TreatmentRow, { kind: "visit" }> = { ...row, items: [] };
    let headerHeight = 48 + textHeight(row.label) + (row.note ? textHeight(row.note) : 0);
    const addHeader = () => {
      if (available < headerHeight + 30) flush();
      rows.push(fragment);
      available -= headerHeight;
    };
    addHeader();
    for (const item of row.items) {
      const height = 12 + textHeight(item.name, 43);
      if (available < height) {
        flush();
        fragment = { ...row, note: undefined, items: [] };
        headerHeight = 48 + textHeight(row.label);
        addHeader();
      }
      fragment.items.push(item);
      available -= height;
    }
  }
  const totalsHeight = 120 + (plan.treatmentNote ? textHeight(plan.treatmentNote, 80) : 0);
  if (available < totalsHeight) flush();
  flush();
  pages[pages.length - 1].showTotals = true;
  return pages;
}
