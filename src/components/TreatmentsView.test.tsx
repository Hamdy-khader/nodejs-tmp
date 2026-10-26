import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  defaultTeeth,
  patientsStore,
  type TreatmentPlan,
  type TreatmentRow,
} from "@/lib/patients-store";
import { TreatmentsView } from "./TreatmentsView";
import { treatmentTotals } from "@/lib/treatment-pricing";

vi.mock("@/lib/pricelist-store", () => ({ usePricelist: () => SECTIONS, pricelistStore: {} }));
const SECTIONS = [
  {
    id: "filling",
    key: "filling",
    n: null,
    label: "Filling",
    icon: "",
    groups: [
      {
        id: "filling",
        key: "filling",
        title: "Filling",
        items: [{ id: "clinic-item", key: "filling", name: "Clinic filling", price: 187.5 }],
      },
    ],
  },
  {
    id: "crown",
    key: "crown",
    n: null,
    label: "Crown",
    icon: "",
    groups: [
      {
        id: "crown",
        key: "crown",
        title: "Crown",
        items: [
          { id: "mc", key: "metal-ceramic-crown", name: "Metal-Ceramic Crown", price: 400 },
          { id: "zr", key: "zirconium-crown", name: "Zirconium Crown", price: 700 },
        ],
      },
    ],
  },
];
const tooth = (n: number) => screen.getByRole("button", { name: `Tooth ${n}` });
const lastRows = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.at(-1)![1] as TreatmentRow[];
const visitItems = (rows: TreatmentRow[]) =>
  rows.flatMap((row) => (row.kind === "visit" ? row.items : []));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows separate jaw rows and limits tooth, price, amount and delete actions to the selected jaw", async () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItems").mockImplementation(() => {});
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const saveTeeth = vi.spyOn(patientsStore, "setTreatmentItemTeeth").mockResolvedValue({});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [
      {
        id: "visit",
        kind: "visit",
        items: [11, 21, 31, 41].map((n) => ({
          id: String(n),
          name: "Ceramic bridge on implant",
          toothNumber: n,
          amount: 1,
          unitPrice: 265,
        })),
      },
    ],
  } as unknown as TreatmentPlan;
  const { container } = render(<TreatmentsView plan={plan} />);
  const rows = container.querySelectorAll<HTMLElement>("[data-treatment-group]");
  expect(rows).toHaveLength(2);
  expect(
    within(rows[0]).getByLabelText("Edit teeth for Ceramic bridge on implant"),
  ).toHaveTextContent("1121");
  expect(
    within(rows[1]).getByLabelText("Edit teeth for Ceramic bridge on implant"),
  ).toHaveTextContent("3141");
  expect(screen.getByText("Visit subtotal").parentElement).toHaveTextContent("1060.00");
  const price = within(rows[0]).getByLabelText("Unit price for Ceramic bridge on implant");
  fireEvent.change(price, { target: { value: "200" } });
  fireEvent.blur(price);
  expect(update).toHaveBeenLastCalledWith("plan", "visit", {
    "11": { unitPrice: 200 },
    "21": { unitPrice: 200 },
  });
  const amount = within(rows[1]).getByLabelText("Amount for Ceramic bridge on implant");
  fireEvent.change(amount, { target: { value: "3" } });
  fireEvent.blur(amount);
  expect(update).toHaveBeenLastCalledWith("plan", "visit", {
    "31": { amount: 2 },
    "41": { amount: 1 },
  });
  fireEvent.click(
    within(rows[1]).getByRole("button", { name: "Edit teeth for Ceramic bridge on implant" }),
  );
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("button", { name: "11" })).toHaveAttribute("aria-pressed", "false");
  expect(dialog.getByRole("button", { name: "31" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(dialog.getByRole("button", { name: "Save teeth" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(saveTeeth).toHaveBeenCalledWith("plan", "visit", ["31", "41"], [31, 41]);
  fireEvent.click(within(rows[0]).getByRole("button", { name: "Remove item" }));
  expect(visitItems(lastRows(save)).map((item) => item.id)).toEqual(["31", "41"]);
});

it("keeps a shared package price linked across its separate jaw rows", () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItems").mockImplementation(() => {});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [
      {
        id: "visit",
        kind: "visit",
        items: [11, 31].map((n) => ({
          id: String(n),
          name: "Bridge",
          toothNumber: n,
          amount: 1,
          unitPrice: 500,
          priceMode: "package",
        })),
      },
    ],
  } as unknown as TreatmentPlan;
  const { container } = render(<TreatmentsView plan={plan} />);
  const rows = container.querySelectorAll<HTMLElement>("[data-treatment-group]");
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByLabelText("Price for Bridge")).toHaveTextContent("500.00");
  expect(within(rows[1]).getByLabelText("Price for Bridge")).toHaveTextContent("In package");
  expect(screen.getByText("Visit subtotal").parentElement).toHaveTextContent("500.00");
  const price = within(rows[1]).getByLabelText("Package price for Bridge");
  fireEvent.change(price, { target: { value: "600" } });
  fireEvent.blur(price);
  expect(update).toHaveBeenCalledWith("plan", "visit", {
    "11": { unitPrice: 600 },
    "31": { unitPrice: 600 },
  });
});

it("offers all four price modes and applies the selected mode to the whole tooth group", async () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItems").mockImplementation(() => {});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [
      {
        id: "visit",
        kind: "visit",
        items: [
          { id: "a", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 500 },
          { id: "b", name: "Veneer", toothNumber: 12, amount: 1, unitPrice: 500 },
        ],
      },
    ],
  } as unknown as TreatmentPlan;
  const { rerender } = render(<TreatmentsView plan={plan} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Price mode for Veneer" }), {
    key: "ArrowDown",
  });
  for (const name of ["Unit price", "Package price", "Free", "In package"])
    expect(await screen.findByRole("menuitem", { name })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: "Package price" }));
  expect(update).toHaveBeenCalledWith("plan", "visit", {
    a: { priceMode: "package" },
    b: { priceMode: "package" },
  });
  for (const mode of ["package", "free", "in-package"] as const) {
    rerender(
      <TreatmentsView
        plan={{
          ...plan,
          treatments: plan.treatments!.map((row) =>
            row.kind === "visit"
              ? { ...row, items: row.items.map((item) => ({ ...item, priceMode: mode })) }
              : row,
          ),
        }}
      />,
    );
    expect(screen.getByLabelText("Price for Veneer")).toHaveTextContent(
      mode === "package" ? "500.00" : "0.00",
    );
  }
});

it("edits teeth on the existing treatment row", async () => {
  const save = vi.spyOn(patientsStore, "setTreatmentItemTeeth").mockResolvedValue({});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [
      {
        id: "visit",
        kind: "visit",
        items: [{ id: "a", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 265 }],
      },
    ],
  } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit teeth for Veneer" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(dialog.querySelector('button[aria-pressed="false"]')!);
  fireEvent.click(screen.getByRole("button", { name: "Save teeth" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(save).toHaveBeenCalledWith("plan", "visit", ["a"], [11, 18]);
});

it("adds one row for the selected teeth and keeps them selected for the next treatment", () => {
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(tooth(12));
  fireEvent.click(tooth(13));
  fireEvent.click(screen.getByRole("button", { name: "Filling" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(tooth(12)).toHaveAttribute("aria-pressed", "true");
  expect(visitItems(lastRows(save))).toMatchObject([
    {
      toothNumber: 13,
      priceMode: "unit",
      amount: 1,
      unitPrice: 187.5,
      catalogItemId: "clinic-item",
    },
    {
      toothNumber: 12,
      priceMode: "unit",
      amount: 1,
      unitPrice: 187.5,
      catalogItemId: "clinic-item",
    },
  ]);
});

it("asks for teeth before adding a tooth treatment", () => {
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(screen.getByRole("button", { name: "Filling" }));
  expect(save).not.toHaveBeenCalled();
});

it("adds the first crown type and switches the row to another type", async () => {
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [] } as unknown as TreatmentPlan;
  const { rerender } = render(<TreatmentsView plan={plan} />);
  fireEvent.click(tooth(15));
  fireEvent.click(tooth(17));
  fireEvent.click(screen.getByRole("button", { name: "Crown" }));
  const rows = lastRows(save);
  expect(visitItems(rows).map((item) => [item.toothNumber, item.name])).toEqual([
    [17, "Metal-Ceramic Crown"],
    [15, "Metal-Ceramic Crown"],
  ]);
  rerender(<TreatmentsView plan={{ ...plan, treatments: rows }} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Change type of Metal-Ceramic Crown" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Zirconium Crown" }));
  expect(visitItems(lastRows(save)).map((item) => [item.name, item.unitPrice])).toEqual([
    ["Zirconium Crown", 700],
    ["Zirconium Crown", 700],
  ]);
});

it("shows matching treatment teeth on one row and edits or removes the whole group", () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItems").mockImplementation(() => {});
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [
      {
        id: "visit",
        kind: "visit",
        items: [
          { id: "a", name: "Veneer", toothNumber: 11, amount: 1, unitPrice: 265 },
          { id: "b", name: "Veneer", toothNumber: 12, amount: 1, unitPrice: 265 },
        ],
      },
    ],
  } as unknown as TreatmentPlan;
  const { container } = render(<TreatmentsView plan={plan} currency="EUR" />);
  expect(container.querySelectorAll("[data-treatment-group]")).toHaveLength(1);
  expect(screen.getByLabelText("Edit teeth for Veneer")).toHaveTextContent("1112");
  expect(screen.getByLabelText("Amount for Veneer")).toHaveValue(2);
  expect(screen.getByLabelText("Price for Veneer")).toHaveTextContent("€ 530.00");
  fireEvent.change(screen.getByLabelText("Unit price for Veneer"), { target: { value: "200" } });
  fireEvent.blur(screen.getByLabelText("Unit price for Veneer"));
  expect(update).toHaveBeenLastCalledWith("plan", "visit", {
    a: { unitPrice: 200 },
    b: { unitPrice: 200 },
  });
  fireEvent.change(screen.getByLabelText("Amount for Veneer"), { target: { value: "4" } });
  fireEvent.blur(screen.getByLabelText("Amount for Veneer"));
  expect(update).toHaveBeenLastCalledWith("plan", "visit", { a: { amount: 2 }, b: { amount: 2 } });
  fireEvent.click(screen.getByRole("button", { name: "Remove item" }));
  expect(visitItems(lastRows(save))).toEqual([]);
});

it("edits the final total for an empty visit and displays a save failure", async () => {
  const save = vi
    .spyOn(patientsStore, "setTreatments")
    .mockRejectedValueOnce(new Error("Save failed"))
    .mockResolvedValue({});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [{ id: "v", kind: "visit", items: [] }],
  } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit total" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Final total" }), {
    target: { value: "250.75" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save total" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
  fireEvent.click(screen.getByRole("button", { name: "Save total" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(treatmentTotals(save.mock.calls[1][1]).total).toBe(250.75);
});

it("separates financed amount from the treatment total", () => {
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [],
    billingMode: "payment",
    paymentPlan: { amount: 434, term: 43, interest: 33 },
  } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  expect(screen.getByText("Financed amount").parentElement).toHaveTextContent("$ 434.00");
  expect(screen.getByText(/financed amount differs/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit payment plan" })).toBeInTheDocument();
});

it("adds a treatment from a dropdown with its saved default price and editable price field", async () => {
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [{ id: "visit", kind: "visit", items: [] }],
  } as unknown as TreatmentPlan;
  const { rerender } = render(<TreatmentsView plan={plan} />);
  fireEvent.click(tooth(16));
  fireEvent.keyDown(screen.getByRole("button", { name: "Filling options" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: /Clinic filling/ }));
  const rows = lastRows(save);
  expect(visitItems(rows)).toMatchObject([
    {
      catalogItemId: "clinic-item",
      name: "Clinic filling",
      unitPrice: 187.5,
      manualPriceOverride: false,
    },
  ]);
  rerender(<TreatmentsView plan={{ ...plan, treatments: rows }} />);
  expect(screen.getByRole("spinbutton", { name: "Unit price for Clinic filling" })).toHaveValue(
    187.5,
  );
  expect(screen.getByText("Visit subtotal").parentElement).toHaveTextContent("$ 187.50");
});

it("lets the user replace a visit treatment price and saves decimal prices on blur", () => {
  const update = vi.spyOn(patientsStore, "updateTreatmentItem").mockImplementation(() => {});
  const plan = {
    id: "plan",
    teeth: defaultTeeth(),
    treatments: [
      {
        id: "visit",
        kind: "visit",
        items: [{ id: "item", name: "Filling", amount: 1, unitPrice: 150 }],
      },
    ],
  } as unknown as TreatmentPlan;
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
    fireEvent.pointerDown(tooth(n));
    fireEvent.click(tooth(n));
  }
  expect(tooth(12)).toHaveAttribute("aria-pressed", "true");
  fireEvent.pointerDown(screen.getByRole("button", { name: "Filling" }));
  expect(tooth(13)).toHaveAttribute("aria-pressed", "true");
  fireEvent.pointerDown(document.body);
  expect(tooth(12)).toHaveAttribute("aria-pressed", "false");
});

it("adds a typed Other... treatment without teeth", () => {
  const save = vi.spyOn(patientsStore, "setTreatments").mockResolvedValue({});
  const plan = { id: "plan", teeth: defaultTeeth(), treatments: [] } as unknown as TreatmentPlan;
  render(<TreatmentsView plan={plan} />);
  fireEvent.click(screen.getByRole("button", { name: "Other" }));
  expect(screen.getByRole("heading", { name: "Other treatment" })).toBeInTheDocument();
  const field = screen.getByLabelText("Treatment");
  fireEvent.change(field, { target: { value: "Night guard" } });
  fireEvent.keyDown(field, { key: "Enter" });
  const [item] = visitItems(lastRows(save));
  expect(item).toMatchObject({
    name: "Night guard",
    catalogSectionKey: "other",
    catalogGroupKey: "other",
  });
  expect(item.toothNumber).toBeUndefined();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
