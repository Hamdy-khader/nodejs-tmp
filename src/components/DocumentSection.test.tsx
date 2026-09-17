import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { documentsStore } from "@/lib/documents-store";
import { DocumentSection } from "./DocumentSection";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("drags a document after another, preserves selection, and can reverse the move", () => {
  const reorder = vi.spyOn(documentsStore, "reorder").mockImplementation(() => {});
  const toggle = vi.spyOn(documentsStore, "toggle").mockImplementation(() => {});
  const items = [{ id: "a", title: "Dentist" }, { id: "b", title: "Custom note" }];
  const view = (order = items) => <DocumentSection section={{ id: "clinic", label: "Clinic" }} items={order} selectedSet={new Set(["a"])} />;
  const { container, rerender } = render(view());
  expect(screen.queryByRole("button", { name: "Move document up" })).not.toBeInTheDocument();
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(screen.getByRole("button", { name: "Drag Dentist" }), { dataTransfer });
  const target = container.querySelector('[data-document-id="b"]')!;
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 100, height: 100 } as DOMRect);
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "clientY", { value: 190 });
  fireEvent(target, drop);
  expect(reorder).toHaveBeenLastCalledWith("clinic", ["b", "a"]);
  expect(toggle).not.toHaveBeenCalled();
  rerender(view([items[1], items[0]]));
  expect(screen.getByRole("button", { name: "Include Dentist" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.keyDown(screen.getByRole("button", { name: "Drag Dentist" }), { key: "ArrowUp" });
  expect(reorder).toHaveBeenLastCalledWith("clinic", ["a", "b"]);
});

it("clears cancelled drags so an unrelated drop does not reorder documents", () => {
  const reorder = vi.spyOn(documentsStore, "reorder").mockImplementation(() => {});
  const { container } = render(<DocumentSection section={{ id: "diagnosis", label: "Diagnosis" }} items={[{ id: "a", title: "A" }, { id: "b", title: "B" }]} selectedSet={new Set()} />);
  const grip = screen.getByRole("button", { name: "Drag A" });
  fireEvent.dragStart(grip, { dataTransfer: { setData: vi.fn() } });
  fireEvent.dragEnd(grip);
  fireEvent.drop(container.querySelector('[data-document-id="b"]')!);
  expect(reorder).not.toHaveBeenCalled();
});
