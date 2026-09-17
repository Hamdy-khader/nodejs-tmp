import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { patientsStore, type TreatmentRow } from "@/lib/patients-store";
import type { Placement, TreatmentPosition } from "@/lib/treatment-order";

const Sorting = createContext<{
  dragged: React.RefObject<TreatmentPosition | null>;
  move: (source: TreatmentPosition, target: TreatmentPosition, placement: Placement) => void;
  rows: TreatmentRow[];
  active: boolean;
  setActive: (active: boolean) => void;
} | null>(null);
const Position = createContext<TreatmentPosition | null>(null);

export function TreatmentSorting({ planId, rows, children }: { planId: string; rows: TreatmentRow[]; children: ReactNode }) {
  const dragged = useRef<TreatmentPosition | null>(null);
  const [active, setActive] = useState(false);
  return <Sorting.Provider value={{ dragged, rows, active, setActive, move: (source, target, placement) => {
    void patientsStore.moveTreatment(planId, source, target, placement).catch(() => toast.error("Could not save treatment order. Please save the plan again."));
  } }}>{children}</Sorting.Provider>;
}

export function SortableTreatment({ position, children }: { position: TreatmentPosition; children: ReactNode }) {
  const sorting = useContext(Sorting)!;
  const [over, setOver] = useState<Placement | null>(null);
  useEffect(() => { if (!sorting.active) setOver(null); }, [sorting.active]);
  return <Position.Provider value={position}><div
    data-sort-kind={position.kind} data-sort-id={position.id}
    className={sorting.active && over === "before" ? "border-t-2 border-primary" : sorting.active && over === "after" ? "border-b-2 border-primary" : ""}
    onDragOver={event => {
      const source = sorting.dragged.current;
      if (!source) return;
      // A row can only be placed beside another complete row.
      if (source.kind === "row" && position.kind === "item") return;
      event.stopPropagation();
      const row = sorting.rows.find(r => r.id === position.id);
      if (source.kind === "item" && position.kind === "row" && row?.kind !== "visit") return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const box = event.currentTarget.getBoundingClientRect();
      setOver(event.clientY < box.top + box.height / 2 ? "before" : "after");
    }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); }}
    onDrop={event => {
      const source = sorting.dragged.current;
      if (!source || (source.kind === "row" && position.kind === "item")) return;
      event.preventDefault(); event.stopPropagation();
      const box = event.currentTarget.getBoundingClientRect();
      sorting.move(source, position, event.clientY < box.top + box.height / 2 ? "before" : "after");
      sorting.dragged.current = null;
      sorting.setActive(false);
      setOver(null);
    }}
    onDragEnd={() => setOver(null)}
  >{children}</div></Position.Provider>;
}

export function TreatmentDragHandle() {
  const sorting = useContext(Sorting)!;
  const position = useContext(Position)!;
  return <button type="button" draggable
    aria-label={position.kind === "row" ? "Drag treatment stage" : "Drag treatment item"}
    title="Drag to reorder, or use the up and down arrow keys"
    className="cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
    onDragStart={event => {
      event.stopPropagation(); sorting.dragged.current = position;
      sorting.setActive(true);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", position.id);
    }}
    onDragEnd={() => { sorting.dragged.current = null; sorting.setActive(false); }}
    onKeyDown={event => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const positions: TreatmentPosition[] = position.kind === "row"
        ? sorting.rows.map(r => ({ kind: "row", id: r.id }))
        : sorting.rows.flatMap(r => r.kind === "visit" && r.items.some(i => i.id === position.id) ? r.items.map(i => ({ kind: "item" as const, id: i.id })) : []);
      const index = positions.findIndex(p => p.id === position.id && p.kind === position.kind);
      const target = positions[index + (event.key === "ArrowUp" ? -1 : 1)];
      if (target) sorting.move(position, target, event.key === "ArrowUp" ? "before" : "after");
    }}
  ><GripVertical className="h-4 w-4" /></button>;
}
