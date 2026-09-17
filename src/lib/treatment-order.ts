import type { TreatmentRow } from "./patients-store";

export type TreatmentPosition = { kind: "row" | "item"; id: string };
export type Placement = "before" | "after";

export function moveTreatment(rows: TreatmentRow[], source: TreatmentPosition, target: TreatmentPosition, placement: Placement): TreatmentRow[] {
  if (source.kind === target.kind && source.id === target.id) return rows;
  if (source.kind === "row") {
    if (target.kind !== "row") return rows;
    const row = rows.find(r => r.id === source.id);
    if (!row || !rows.some(r => r.id === target.id)) return rows;
    const next = rows.filter(r => r.id !== source.id);
    const index = next.findIndex(r => r.id === target.id);
    next.splice(index + (placement === "after" ? 1 : 0), 0, row);
    return next;
  }
  const from = rows.find(r => r.kind === "visit" && r.items.some(i => i.id === source.id));
  const to = rows.find(r => r.kind === "visit" && (target.kind === "row" ? r.id === target.id : r.items.some(i => i.id === target.id)));
  if (from?.kind !== "visit" || to?.kind !== "visit") return rows;
  const item = from.items.find(i => i.id === source.id)!;
  return rows.map(row => {
    if (row.kind !== "visit" || (row.id !== from.id && row.id !== to.id)) return row;
    const items = row.items.filter(i => i.id !== source.id);
    if (row.id === to.id) {
      const index = target.kind === "row" ? (placement === "before" ? 0 : items.length) : items.findIndex(i => i.id === target.id) + (placement === "after" ? 1 : 0);
      items.splice(index, 0, item);
    }
    return { ...row, items };
  });
}
