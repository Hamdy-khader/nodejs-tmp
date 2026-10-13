import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TeethChart } from "./TeethChart";
import { defaultTeeth } from "@/lib/patients-store";

afterEach(cleanup);
function setup(highlighted: number[] = []) {
  const onSelect = vi.fn(), onSelectMany = vi.fn();
  const { container } = render(<TeethChart teeth={defaultTeeth()} highlighted={highlighted} onSelect={onSelect} onSelectMany={onSelectMany} />);
  const teeth = [...container.querySelectorAll<HTMLElement>('[data-tooth-number]')];
  teeth.forEach((tooth, index) => vi.spyOn(tooth, "getBoundingClientRect").mockReturnValue({ left: (index % 16) * 20 + 10, right: (index % 16) * 20 + 28, top: index < 16 ? 10 : 70, bottom: index < 16 ? 60 : 120 } as DOMRect));
  const area = container.querySelector('[data-diagnosis-selection]')!;
  const pointer = (type: string, x: number, y: number, shiftKey = false) => fireEvent(area, new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, buttons: 1, shiftKey }));
  return { container, teeth, area, pointer, onSelect, onSelectMany };
}

it("selects both jaws with one mouse drag and suppresses the following tooth click", () => {
  const { teeth, pointer, onSelectMany, onSelect, container } = setup();
  pointer("pointerdown", 0, 0);
  pointer("pointermove", 340, 130);
  expect(onSelectMany).toHaveBeenLastCalledWith(teeth.map(t => Number(t.dataset.toothNumber)));
  expect(container.querySelector('[data-selection-box]')).not.toBeNull();
  pointer("pointerup", 340, 130);
  fireEvent.click(teeth[0]);
  expect(onSelect).not.toHaveBeenCalled();
  expect(container.querySelector('[data-selection-box]')).toBeNull();
});

it("supports reverse dragging and Shift to retain an existing selection", () => {
  const { pointer, onSelectMany, teeth } = setup([48]);
  pointer("pointerdown", 49, 61, true);
  pointer("pointermove", 9, 9);
  expect(onSelectMany).toHaveBeenLastCalledWith([48, Number(teeth[0].dataset.toothNumber), Number(teeth[1].dataset.toothNumber)]);
  pointer("pointercancel", 9, 9);
  expect(onSelectMany).toHaveBeenLastCalledWith([48]);
});

it("keeps ordinary tooth clicking when the mouse has not been dragged", () => {
  const { pointer, teeth, onSelect, onSelectMany } = setup();
  pointer("pointerdown", 15, 15);
  pointer("pointermove", 16, 16);
  pointer("pointerup", 16, 16);
  fireEvent.click(teeth[0]);
  expect(onSelect).toHaveBeenCalledWith(Number(teeth[0].dataset.toothNumber));
  expect(onSelectMany).not.toHaveBeenCalled();
});
