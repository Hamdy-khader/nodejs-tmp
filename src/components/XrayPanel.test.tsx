import { createRef } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { XrayPanel, type XrayPanelHandle } from "./XrayPanel";
import { patientsStore } from "@/lib/patients-store";
import { renderXrayImage } from "@/lib/xray-image";
import { clinicApi } from "@/lib/admin/api";

vi.mock("@/lib/patients-store", () => ({ patientsStore: { loadXrays: vi.fn(), replaceXray: vi.fn(), addXrays: vi.fn(), removeXray: vi.fn() } }));
vi.mock("@/lib/admin/api", () => ({ clinicApi: { plans: { downloadXray: vi.fn() } } }));
vi.mock("@/lib/xray-image", async (original) => ({ ...await original<typeof import("@/lib/xray-image")>(), renderXrayImage: vi.fn() }));
vi.mock("@/components/ui/slider", () => ({ Slider: ({ value, onValueChange, ...props }: { value: number[]; onValueChange: (v: number[]) => void }) =>
  <input type="range" {...props} value={value[0]} onChange={(e) => onValueChange([Number(e.target.value)])} />,
}));

// jsdom has no PointerEvent; without it the drag test's coordinates are lost.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  vi.stubGlobal("PointerEvent", PointerEventPolyfill);
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clinicApi.plans.downloadXray).mockResolvedValue(new Blob(["source"]));
  vi.mocked(renderXrayImage).mockResolvedValue(new File(["edited"], "xray-edited.png", { type: "image/png" }));
  vi.mocked(patientsStore.replaceXray).mockResolvedValue(undefined);
});

const XRAYS = [{ id: "xray", url: "/original.png", sortOrder: 1 }];

function setup(xrays = XRAYS) {
  const handle = createRef<XrayPanelHandle>();
  render(<XrayPanel ref={handle} planId="plan" xrays={xrays} />);
  const image = screen.getByAltText("X-ray 1");
  for (const [key, value] of Object.entries({ complete: true, naturalWidth: 1600, clientWidth: 800, clientHeight: 400 })) {
    Object.defineProperty(image, key, { value });
  }
  Object.defineProperty(image.parentElement, "clientWidth", { value: 800 });
  Object.defineProperty(image.parentElement, "clientHeight", { value: 600 });
  fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "200" } });
  return handle;
}

async function confirmDelete() {
  fireEvent.click(screen.getByRole("button", { name: "Delete X-ray" }));
  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
}

it("shows the upload area when the plan has no X-ray", () => {
  render(<XrayPanel planId="plan" xrays={[]} />);
  expect(screen.getByRole("button", { name: "Upload OPG X-ray" })).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("bakes the visible adjustments into the image on save and waits for the server", async () => {
  let finish!: () => void;
  vi.mocked(patientsStore.replaceXray).mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  const handle = setup();
  let saved: Promise<boolean>;
  act(() => { saved = handle.current!.save(); });
  await waitFor(() => expect(patientsStore.replaceXray).toHaveBeenCalledWith("plan", "xray", expect.any(File)));
  expect(renderXrayImage).toHaveBeenCalledWith(
    expect.any(Blob),
    { zoom: 200, brightness: 100, contrast: 100, invert: false, rotation: 0, offsetX: 0, offsetY: 0 },
    { width: 800, height: 600, imageWidth: 800, imageHeight: 400 },
  );
  expect(screen.getByRole("status")).toHaveTextContent("Saving…");
  await act(async () => { finish(); });
  await expect(saved!).resolves.toBe(true);
  expect(screen.getByText("Zoom (100%)")).toBeInTheDocument();
});

it("keeps the adjustments after a failed save so it can be retried", async () => {
  vi.mocked(patientsStore.replaceXray).mockRejectedValueOnce(new Error("Save failed"));
  const handle = setup();
  await act(async () => { expect(await handle.current!.save()).toBe(false); });
  expect(screen.getByText("Zoom (200%)")).toBeInTheDocument();
  await act(async () => { expect(await handle.current!.save()).toBe(true); });
  expect(screen.getByText("Zoom (100%)")).toBeInTheDocument();
  expect(patientsStore.replaceXray).toHaveBeenCalledTimes(2);
});

it("inverts, rotates and resets the image like the reference viewer", () => {
  setup();
  const image = screen.getByAltText("X-ray 1");
  fireEvent.click(screen.getByRole("button", { name: "Invert colors" }));
  fireEvent.click(screen.getByRole("button", { name: "Rotate 90°" }));
  expect(screen.getByRole("button", { name: "Invert colors" })).toHaveAttribute("aria-pressed", "true");
  expect(image.style.filter).toContain("invert(1)");
  expect(image.style.transform).toContain("rotate(90deg)");
  expect(image.style.transform).toContain("scale(2)");
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(image.style.filter).not.toContain("invert");
  expect(image.style.transform).toContain("rotate(0deg)");
  expect(screen.getByText("Zoom (100%)")).toBeInTheDocument();
});

it("moves the image by dragging it", () => {
  setup();
  const image = screen.getByAltText("X-ray 1");
  const surface = image.parentElement!;
  fireEvent.pointerDown(surface, { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(surface, { clientX: 140, clientY: 75 });
  fireEvent.pointerUp(surface);
  fireEvent.pointerMove(surface, { clientX: 300, clientY: 300 });
  expect(image.style.transform).toContain("translate(40px, -25px)");
});

it("shows the position and moves between X-rays, saving the current one first", async () => {
  setup([...XRAYS, { id: "second", url: "/second.png", sortOrder: 2 }]);
  expect(screen.getByText("1 / 2")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next X-ray" })); });
  expect(patientsStore.replaceXray).toHaveBeenCalledWith("plan", "xray", expect.any(File));
  expect(screen.getByText("2 / 2")).toBeInTheDocument();
});

it("asks before deleting and does not save discarded adjustments", async () => {
  let finish!: () => void;
  vi.mocked(patientsStore.removeXray).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete X-ray" }));
  expect(patientsStore.removeXray).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  expect(patientsStore.removeXray).toHaveBeenCalledWith("plan", "xray");
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete X-ray" })).toBeDisabled());
  expect(screen.getByRole("status")).toHaveTextContent("Deleting…");
  expect(patientsStore.replaceXray).not.toHaveBeenCalled();
  await act(async () => { finish(); });
  await waitFor(() => expect(screen.getByText("Zoom (100%)")).toBeInTheDocument());
});

it("keeps the image and adjustments after a failed deletion so it can be retried", async () => {
  vi.mocked(patientsStore.removeXray).mockRejectedValueOnce(new Error("Delete failed")).mockResolvedValueOnce(undefined);
  setup();
  await confirmDelete();
  await waitFor(() => expect(screen.getByRole("button", { name: "Delete X-ray" })).toBeEnabled());
  expect(screen.getByText("Zoom (200%)")).toBeInTheDocument();
  expect(screen.getByAltText("X-ray 1")).toBeInTheDocument();
  await confirmDelete();
  await waitFor(() => expect(screen.getByText("Zoom (100%)")).toBeInTheDocument());
  expect(patientsStore.removeXray).toHaveBeenCalledTimes(2);
});
