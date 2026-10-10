import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { defaultTeeth, patientsStore, type TreatmentPlan } from "@/lib/patients-store";
import { TreatmentsView } from "./TreatmentsView";
import { treatmentTotals } from "@/lib/treatment-pricing";

vi.mock("@/lib/pricelist-store", () => ({ usePricelist: () => [{
  id: "clinic", key: "clinic", label: "Clinic services", groups: [{
    id: "group", key: "group", title: "Custom", items: [
      { id: "clinic-item", key: "clinic-key", name: "Clinic filling", price: 187.5 },
    ],
  }],
}], pricelistStore: {} }));
vi.mock("@/components/TeethChart", () => ({
  TeethChart: ({ onSelect, highlighted }: { onSelect: (n: number) => void; highlighted: number[] }) => (
    <div>
      {[12, 13].map(n => <button key={n} data-tooth-number={n} onClick={() => onSelect(n)}>{n}</button>)}
      <output data-testid="selected">{highlighted.join(",")}</output>
    </div>
  ),
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("offers all four price modes and applies the selected mode to the whole tooth group", async () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItems").mockImplementation(() => {});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [{ id: "visit", kind: "visit", items: [
    { id: "a", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 500 },
    { id: "b", name: "Veneer", toothNumber: 12, amount: 1, unitPrice: 500 },
  ] }] } as unknown as TreatmentPlan;
  const { rerender } = render(<TreatmentsView plan={plan} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Price mode for Veneer" }), { key: "ArrowDown" });
  for (const name of ["Unit price", "Package price", "Free", "In package"]) expect(await screen.findByRole("menuitem", { name })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: "Package price" }));
  expect(update).toHaveBeenCalledWith("plan", "visit", { a: { priceMode: "package" }, b: { priceMode: "package" } });
  for (const mode of ["package", "free", "in-package"] as const) {
    rerender(<TreatmentsView plan={{ ...plan, treatments: plan.treatments!.map(row => row.kind === "visit" ? { ...row, items: row.items.map(item => ({ ...item, priceMode: mode })) } : row) }} />);
    expect(screen.getByLabelText("Price for Veneer")).toHaveTextContent(mode === "package" ? "500.00" : "0.00");
  }
});

it("edits teeth on the existing treatment row", async () => {
  const save = vi.spyOn(patientsStore, "setTreatmentItemTeeth").mockResolvedValue({});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [{ id: "visit", kind: "visit", items: [{ id: "a", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 265 }] }] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit teeth for Veneer" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(dialog.querySelector('button[aria-pressed="false"]')!);
  fireEvent.click(screen.getByRole("button", { name: "Save teeth" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(save).toHaveBeenCalledWith("plan", "visit", ["a"], [11, 18]);
});

it("adds selected teeth immediately and clears selection without a price popup", async () => {
  const add = vi.spyOn(patientsStore, "addTreatmentItemToLastVisit").mockImplementation(() => {});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  for (const name of ["12", "13"]) fireEvent.click(screen.getByRole("button", { name }));
  fireEvent.keyDown(screen.getByRole("button", { name: "Clinic services" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: /Custom: Clinic filling/ }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByTestId("selected")).toBeEmptyDOMElement();
  expect(add.mock.calls.map(call => call[1])).toMatchObject([
    { toothNumber: 12, priceMode: "unit", amount: 1, unitPrice: 187.5 },
    { toothNumber: 13, priceMode: "unit", amount: 1, unitPrice: 187.5 },
  ]);
});

it("shows matching treatment teeth on one row and edits or removes the whole group", () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItems").mockImplementation(() => {});
  const remove = vi.spyOn(patientsStore, "removeTreatmentItems").mockImplementation(() => {});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [{ id: "visit", kind: "visit", items: [
    { id: "a", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 265 },
    { id: "b", name: "Veneer", toothNumber: 12, amount: 1, unitPrice: 265 },
  ] }] } as unknown as TreatmentPlan;
  const { container } = render(<TreatmentsView plan={plan} currency="EUR" />);
  expect(container.querySelectorAll('[data-treatment-group]')).toHaveLength(1);
  expect(screen.getByLabelText("Teeth for Veneer")).toHaveTextContent("1112");
  expect(screen.getByLabelText("Amount for Veneer")).toHaveValue(2);
  expect(screen.getByLabelText("Price for Veneer")).toHaveTextContent("€ 530.00");
  fireEvent.change(screen.getByLabelText("Unit price for Veneer"), { target: { value: "200" } });
  fireEvent.blur(screen.getByLabelText("Unit price for Veneer"));
  expect(update).toHaveBeenLastCalledWith("plan", "visit", { a: { unitPrice: 200 }, b: { unitPrice: 200 } });
  fireEvent.change(screen.getByLabelText("Amount for Veneer"), { target: { value: "4" } });
  fireEvent.blur(screen.getByLabelText("Amount for Veneer"));
  expect(update).toHaveBeenLastCalledWith("plan", "visit", { a: { amount: 2 }, b: { amount: 2 } });
  fireEvent.click(screen.getByRole("button", { name: "Remove item" }));
  expect(remove).toHaveBeenCalledWith("plan", "visit", ["a", "b"]);
});

it("edits the final total for an empty visit and displays a save failure", async () => {
  const save = vi.spyOn(patientsStore, "setTreatments").mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue({});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [{ id: "v", kind: "visit", items: [] }] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit total" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Final total" }), { target: { value: "250.75" } });
  fireEvent.click(screen.getByRole("button", { name: "Save total" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
  fireEvent.click(screen.getByRole("button", { name: "Save total" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(treatmentTotals(save.mock.calls[1][1]).total).toBe(250.75);
});

it("separates financed amount from the treatment total", () => {
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [], billingMode: "payment",
    paymentPlan: { amount: 434, term: 43, interest: 33 } } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  expect(screen.getByText("Financed amount").parentElement).toHaveTextContent("$ 434.00");
  expect(screen.getByText(/financed amount differs/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit payment plan" })).toBeInTheDocument();
});

it("adds the selected clinic treatment with its saved default price and editable price field", async () => {
  const add = vi.spyOn(patientsStore, "addTreatmentItemToLastVisit").mockImplementation(() => {});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [{ id: "visit", kind: "visit", items: [] }] } as unknown as TreatmentPlan;
  const { rerender } = render(<TreatmentsView plan={plan} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Clinic services" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: /Custom: Clinic filling/ }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(add).toHaveBeenCalledWith("plan", expect.objectContaining({
    catalogItemId: "clinic-item", name: "Clinic filling", unitPrice: 187.5, manualPriceOverride: false,
  }));
  const item = { ...add.mock.calls[0][1], id: "item" };
  rerender(<TreatmentsView plan={{ ...plan, treatments: [{ id: "visit", kind: "visit", items: [item] }] }} />);
  expect(screen.getByRole("spinbutton", { name: "Unit price for Clinic filling" })).toHaveValue(187.5);
  expect(screen.getByText("Visit subtotal").parentElement).toHaveTextContent("$ 187.50");
});

it("lets the user replace a visit treatment price and saves decimal prices on blur", () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItem").mockImplementation(() => {});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [
    { id: "visit", kind: "visit", items: [{ id: "item", name: "Filling", amount: 1, unitPrice: 150 }] },
  ] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  const input = screen.getByRole("spinbutton", { name: "Unit price for Filling" });
  fireEvent.change(input, { target: { value: "" } });
  expect(input).toHaveValue(null);
  expect(update).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "125.5" } });
  fireEvent.blur(input);
  expect(update).toHaveBeenCalledWith("plan", "visit", "item", { unitPrice: 125.5 });
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.blur(input);
  expect(update).toHaveBeenLastCalledWith("plan", "visit", "item", { unitPrice: 0 });
});

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
