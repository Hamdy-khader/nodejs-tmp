import type { TreatmentRow } from "./patients-store";

export type TreatmentPosition = { kind: "row" | "item"; id: string; itemIds?: string[] };
export type Placement = "before" | "after";

export function moveTreatment(
  rows: TreatmentRow[],
  source: TreatmentPosition,
  target: TreatmentPosition,
  placement: Placement,
): TreatmentRow[] {
  if (source.kind === target.kind && source.id === target.id) return rows;
  if (source.kind === "row") {
    if (target.kind !== "row") return rows;
    const row = rows.find((r) => r.id === source.id);
    if (!row || !rows.some((r) => r.id === target.id)) return rows;
    const next = rows.filter((r) => r.id !== source.id);
    const index = next.findIndex((r) => r.id === target.id);
    next.splice(index + (placement === "after" ? 1 : 0), 0, row);
    return next;
  }
  const from = rows.find((r) => r.kind === "visit" && r.items.some((i) => i.id === source.id));
  const to = rows.find(
    (r) =>
      r.kind === "visit" &&
      (target.kind === "row" ? r.id === target.id : r.items.some((i) => i.id === target.id)),
  );
  if (from?.kind !== "visit" || to?.kind !== "visit") return rows;
  const sourceIds = new Set(source.itemIds ?? [source.id]);
  const movedItems = from.items.filter((i) => sourceIds.has(i.id));
  const targetIds = new Set(target.itemIds ?? [target.id]);
  if (target.kind === "item" && movedItems.some((i) => targetIds.has(i.id))) return rows;
  return rows.map((row) => {
    if (row.kind !== "visit" || (row.id !== from.id && row.id !== to.id)) return row;
    const items = row.items.filter((i) => !sourceIds.has(i.id));
    if (row.id === to.id) {
      const targetIndices = items.flatMap((item, index) => (targetIds.has(item.id) ? [index] : []));
      const index =
        target.kind === "row"
          ? placement === "before"
            ? 0
            : items.length
          : placement === "before"
            ? Math.min(...targetIndices)
            : Math.max(...targetIndices) + 1;
      items.splice(index, 0, ...movedItems);
    }
    return { ...row, items };
  });
}
