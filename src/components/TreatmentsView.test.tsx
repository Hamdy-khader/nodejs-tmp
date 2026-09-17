import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { defaultTeeth, type TreatmentPlan } from "@/lib/patients-store";
import { TreatmentsView } from "./TreatmentsView";

vi.mock("@/lib/pricelist-store", () => ({ usePricelist: () => [], pricelistStore: {} }));
vi.mock("@/components/TeethChart", () => ({
  TeethChart: ({ onSelect, highlighted }: { onSelect: (n: number) => void; highlighted: number[] }) => (
    <div>
      {[12, 13].map(n => <button key={n} data-tooth-number={n} onClick={() => onSelect(n)}>{n}</button>)}
      <output data-testid="selected">{highlighted.join(",")}</output>
    </div>
  ),
}));
afterEach(cleanup);

it("clears multiple selected teeth outside while preserving selection on treatment controls", () => {
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  for (const n of [12, 13]) {
    fireEvent.pointerDown(screen.getByText(String(n)));
    fireEvent.click(screen.getByText(String(n)));
  }
  expect(screen.getByTestId("selected")).toHaveTextContent("12,13");
  fireEvent.pointerDown(screen.getByText("Clinic treatments"));
  expect(screen.getByTestId("selected")).toHaveTextContent("12,13");
  fireEvent.pointerDown(document.body);
  expect(screen.getByTestId("selected")).toBeEmptyDOMElement();
});
