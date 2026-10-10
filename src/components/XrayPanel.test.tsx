import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { XrayPanel } from "./XrayPanel";
import { patientsStore } from "@/lib/patients-store";
import { renderXrayImage } from "@/lib/xray-image";
import { clinicApi } from "@/lib/admin/api";

vi.mock("@/lib/patients-store", () => ({ patientsStore: { loadXrays: vi.fn(), replaceXray: vi.fn(), addXrays: vi.fn(), removeXray: vi.fn() } }));
vi.mock("@/lib/admin/api", () => ({ clinicApi: { plans: { downloadXray: vi.fn() } } }));
vi.mock("@/lib/xray-image", async (original) => ({ ...await original<typeof import("@/lib/xray-image")>(), renderXrayImage: vi.fn() }));
vi.mock("@/components/ui/slider", () => ({ Slider: ({ value, onValueChange, ...props }: { value: number[]; onValueChange: (v: number[]) => void }) =>
  <input type="range" {...props} value={value[0]} onChange={(e) => onValueChange([Number(e.target.value)])} />,
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clinicApi.plans.downloadXray).mockResolvedValue(new Blob(["source"]));
  vi.mocked(renderXrayImage).mockResolvedValue(new File(["edited"], "xray-edited.png", { type: "image/png" }));
  vi.mocked(patientsStore.replaceXray).mockResolvedValue(undefined);
});

function setup() {
  const onClose = vi.fn();
  render(<XrayPanel planId="plan" xrays={[{ id: "xray", url: "/original.png", sortOrder: 1 }]} onClose={onClose} />);
  const image = screen.getByAltText("X-ray 1");
  for (const [key, value] of Object.entries({ complete: true, naturalWidth: 1600, clientWidth: 800, clientHeight: 400 })) {
    Object.defineProperty(image, key, { value });
  }
  Object.defineProperty(image.parentElement, "clientWidth", { value: 800 });
  Object.defineProperty(image.parentElement, "clientHeight", { value: 600 });
  fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "200" } });
  return onClose;
}

it("saves the visible crop before closing and waits for the server", async () => {
  let finish!: () => void;
  vi.mocked(patientsStore.replaceXray).mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  const onClose = setup();
  fireEvent.click(screen.getByRole("button", { name: "Close X-ray" }));
  await waitFor(() => expect(patientsStore.replaceXray).toHaveBeenCalledWith("plan", "xray", expect.any(File)));
  expect(renderXrayImage).toHaveBeenCalledWith(expect.any(Blob), { zoom: 200, brightness: 100, contrast: 100 }, { width: 800, height: 600, imageWidth: 800, imageHeight: 400 });
  expect(onClose).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
});

it("keeps edits and the panel open after failed saves, and allows retry", async () => {
  vi.mocked(patientsStore.replaceXray).mockRejectedValueOnce(new Error("Save failed"));
  const onClose = setup();
  fireEvent.click(screen.getByRole("button", { name: "Close X-ray" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save image" })).toBeEnabled());
  expect(screen.getByText("Zoom (200%)")).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save image" }));
  await waitFor(() => expect(screen.getByText("Zoom (100%)")).toBeInTheDocument());
  expect(patientsStore.replaceXray).toHaveBeenCalledTimes(2);
});

it("deletes the selected image without saving discarded adjustments", async () => {
  let finish!: () => void;
  vi.mocked(patientsStore.removeXray).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete image" }));
  expect(patientsStore.removeXray).toHaveBeenCalledWith("plan", "xray");
  expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Close X-ray" })).toBeDisabled();
  expect(patientsStore.replaceXray).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(screen.getByText("Zoom (100%)")).toBeInTheDocument());
});

it("keeps the image and adjustments after a failed deletion so it can be retried", async () => {
  vi.mocked(patientsStore.removeXray).mockRejectedValueOnce(new Error("Delete failed")).mockResolvedValueOnce(undefined);
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete image" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete image" })).toBeEnabled());
  expect(screen.getByText("Zoom (200%)")).toBeInTheDocument();
  expect(screen.getByAltText("X-ray 1")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete image" }));
  await waitFor(() => expect(screen.getByText("Zoom (100%)")).toBeInTheDocument());
  expect(patientsStore.removeXray).toHaveBeenCalledTimes(2);
});
