import type { TreatmentRow } from "./patients-store";

const adjustmentNote = "Manual total adjustment";
export const isTotalAdjustment = (row: TreatmentRow) => row.note === adjustmentNote;
export const withoutTotalAdjustment = (rows: TreatmentRow[]) => rows.filter(row => !isTotalAdjustment(row));

export function treatmentTotals(rows: TreatmentRow[]) {
  const subtotal = rows.reduce((sum, row) => sum + (row.kind === "visit"
    ? row.items.reduce((value, item) => value + item.amount * item.unitPrice, 0) : 0), 0);
  const discount = rows.reduce((sum, row) => sum + (row.kind === "discount"
    ? row.mode === "percent" ? subtotal * row.value / 100 : row.value : 0), 0);
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

// Store adjustments as existing plan rows so saving, reloading and reports use
// the same total without changing clinic prices or the original treatment fees.
export function setTreatmentTotal(rows: TreatmentRow[], target: number, uid: () => string): TreatmentRow[] {
  if (!Number.isFinite(target) || target < 0) throw new Error("Enter a valid total of zero or more.");
  target = Math.round(target * 100) / 100;
  const next = withoutTotalAdjustment(rows);
  const base = treatmentTotals(next);
  if (Math.abs(base.total - target) < 0.005) return next;
  if (target > base.total) {
    const percent = next.reduce((sum, row) => sum + (row.kind === "discount" && row.mode === "percent" ? row.value / 100 : 0), 0);
    if (percent >= 1) throw new Error("Reduce percentage discounts below 100% before increasing the total.");
    const fee = Math.ceil((target - (base.subtotal - base.discount)) / (1 - percent) * 100) / 100;
    next.push({ id: uid(), kind: "visit", label: "Price adjustment", note: adjustmentNote,
      items: [{ id: uid(), name: "Price adjustment", amount: 1, unitPrice: fee, manualPriceOverride: true }] });
  }
  const reduction = Math.round((treatmentTotals(next).total - target) * 100) / 100;
  if (reduction > 0) next.push({ id: uid(), kind: "discount", mode: "amount", value: reduction, note: adjustmentNote });
  return next;
}
