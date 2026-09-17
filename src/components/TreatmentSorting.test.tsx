import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { patientsStore, type TreatmentRow } from "@/lib/patients-store";
import { SortableTreatment, TreatmentDragHandle, TreatmentSorting } from "./TreatmentSorting";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("drops a stage before another stage and supports reversing the move with the keyboard", () => {
  const move = vi.spyOn(patientsStore, "moveTreatment").mockResolvedValue(undefined);
  const rows: TreatmentRow[] = [{ id: "v", kind: "visit", items: [] }, { id: "h", kind: "healing", days: 30 }];
  const view = (order: TreatmentRow[]) => <TreatmentSorting planId="plan" rows={order}>
    {order.map(row => <SortableTreatment key={row.id} position={{ kind: "row", id: row.id }}><TreatmentDragHandle />{row.id}</SortableTreatment>)}
  </TreatmentSorting>;
  const { container, rerender } = render(view(rows));
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(screen.getAllByRole("button")[1], { dataTransfer });
  const target = container.querySelector('[data-sort-id="v"]')!;
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 100, height: 100 } as DOMRect);
  fireEvent.dragOver(target, { dataTransfer, clientY: 110 });
  // jsdom's DragEvent lacks clientY, so define it explicitly for the drop.
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "clientY", { value: 110 });
  fireEvent(target, drop);
  expect(move).toHaveBeenLastCalledWith("plan", { kind: "row", id: "h" }, { kind: "row", id: "v" }, "before");
  rerender(view([rows[1], rows[0]]));
  fireEvent.keyDown(screen.getAllByRole("button")[0], { key: "ArrowDown" });
  expect(move).toHaveBeenLastCalledWith("plan", { kind: "row", id: "h" }, { kind: "row", id: "v" }, "after");
});
