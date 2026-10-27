import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clinicApi, ApiError, type PricelistData } from "@/lib/admin/api";
import { ClinicFeesPage } from "@/components/ClinicFeesPage";
import { toast } from "sonner";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => () => ({}), useNavigate: () => navigate }));
vi.mock("@/lib/admin/api", async original => ({
  ...await original<typeof import("@/lib/admin/api")>(),
  clinicTokenStore: { exists: () => true },
  clinicApi: { pricelist: { get: vi.fn(), save: vi.fn(), saveCurrency: vi.fn(), addItem: vi.fn() } },
}));
vi.mock("@/lib/pricelist-store", () => ({ pricelistStore: { setSections: vi.fn() }, toPriceSections: (sections: unknown) => sections }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const catalog: PricelistData = {
  settings: { language: "en", currency_code: "USD", currency_label: "United States dollar", currency_symbol: "$" },
  sections: [{ id: "section", key: "filling", n: 1, label: "Filling", icon: "droplet", groups: [{ id: "group", key: "other", title: "Other treatments", price_label: null, items: [] }] }],
};
beforeEach(() => {
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(clinicApi.pricelist.get).mockResolvedValue(structuredClone(catalog));
});
afterEach(cleanup);

async function chooseEuro() {
  render(<ClinicFeesPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Currency" }));
  expect(screen.queryByText("Language")).not.toBeInTheDocument();
  expect(screen.getAllByRole("combobox")).toHaveLength(1);
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Euro (EUR) - EUR" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "OK" })); });
}

it("saves only currency settings, removes the language selector and restores the saved currency", async () => {
  const settings = { currency_code: "EUR", currency_label: "Euro", currency_symbol: "EUR" };
  vi.mocked(clinicApi.pricelist.saveCurrency).mockResolvedValue({ ...catalog, settings: { ...catalog.settings, ...settings } });
  await chooseEuro();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(clinicApi.pricelist.saveCurrency).toHaveBeenCalledWith(settings);
  expect(clinicApi.pricelist.save).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Currency" })).toHaveTextContent("EUREuro");
  fireEvent.click(screen.getByRole("button", { name: "Currency" }));
  expect(screen.getByRole("combobox")).toHaveTextContent("Euro (EUR)");
});

it("keeps the currency dialog open and shows the server validation message when saving fails", async () => {
  vi.mocked(clinicApi.pricelist.saveCurrency).mockRejectedValue(new ApiError("validation", "Invalid currency", 422, { "settings.currency_code": ["Currency code is invalid."] }));
  await chooseEuro();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Currency code is invalid."));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
  expect(toast.success).not.toHaveBeenCalled();
});

it("never offers deletion for catalog treatments, even when an older API allows it", async () => {
  const data = structuredClone(catalog);
  data.sections[0].groups[0].items = [{ id: "item", name: "Filling", price: 150, note: "", can_delete: true, is_used: false }];
  vi.mocked(clinicApi.pricelist.get).mockResolvedValue(data);
  render(<ClinicFeesPage />);
  await screen.findByDisplayValue("Filling");
  expect(screen.queryByTitle("Delete treatment")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("150")).toBeEnabled();
});

it("lists sections under their treatment buttons, with veneers under the crown button", async () => {
  const group = (id: string, key: string, title: string) => ({ id, key, title, price_label: null, items: [] });
  const data = structuredClone(catalog);
  data.sections = [
    { id: "crown", key: "crown", n: null, label: "Crown", icon: "crown", groups: [group("g1", "crown", "Crown"), group("g2", "other", "Other treatments")] },
    { id: "veneer", key: "veneer", n: null, label: "Veneer", icon: "sparkles", groups: [group("g3", "veneer", "Veneer"), group("g4", "other", "Other treatments")] },
  ];
  vi.mocked(clinicApi.pricelist.get).mockResolvedValue(data);
  render(<ClinicFeesPage />);
  expect(await screen.findByRole("heading", { level: 2, name: "Button 7 - Crown" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  expect(screen.getAllByRole("heading", { level: 3 }).map(heading => heading.textContent)).toEqual([
    "Crown", "Other treatments", "Veneer", "Other treatments (Veneer)",
  ]);
});

it("adds a treatment from the group's + button and keeps the row when saving fails", async () => {
  vi.mocked(clinicApi.pricelist.addItem)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ id: "new", name: "Night guard", price: 80, note: "" });
  render(<ClinicFeesPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Other treatments" }));
  fireEvent.change(screen.getByLabelText("New treatment name"), { target: { value: "Night guard" } });
  fireEvent.change(screen.getByLabelText("New treatment price"), { target: { value: "80" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Add" })); });
  expect(toast.error).toHaveBeenCalledWith("Failed to add treatment.");
  expect(screen.getByLabelText("New treatment name")).toHaveValue("Night guard");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Add" })); });
  expect(clinicApi.pricelist.addItem).toHaveBeenLastCalledWith({ group_id: "group", name: "Night guard", price: 80, note: "" });
  expect(screen.queryByLabelText("New treatment name")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("Night guard")).toBeInTheDocument();
});

it("locks the name and note of a used treatment and keeps its price editable", async () => {
  const data = structuredClone(catalog);
  data.sections[0].groups[0].items = [{ id: "item", name: "Filling", price: 150, note: "", is_used: true, usage_count: 2 }];
  vi.mocked(clinicApi.pricelist.get).mockResolvedValue(data);
  render(<ClinicFeesPage />);
  expect(await screen.findByDisplayValue("Filling")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Note for Filling")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Price for Filling")).not.toHaveAttribute("readonly");
  expect(screen.getByTitle("Used in 2 treatment plans. Only the price can be changed.")).toBeInTheDocument();
});
