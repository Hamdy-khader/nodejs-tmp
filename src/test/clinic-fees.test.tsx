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
  clinicApi: { pricelist: { get: vi.fn(), save: vi.fn(), saveCurrency: vi.fn() } },
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
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
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
  expect(screen.getByText("EUR")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
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
