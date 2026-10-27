import { act, renderHook, cleanup, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/api", () => ({ clinicApi: { planSettings: { get: vi.fn(), update: vi.fn() } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
afterEach(cleanup);

it("saves rapid edits in order and persists the latest complete design", async () => {
  vi.resetModules();
  const { clinicApi } = await import("@/lib/admin/api");
  vi.mocked(clinicApi.planSettings.get).mockResolvedValue({ page_size: "A4" });
  let finishFirst!: (value: Record<string, unknown>) => void;
  vi.mocked(clinicApi.planSettings.update).mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
    .mockResolvedValue({});
  const { planSettingsStore, usePlanSettings } = await import("./plan-settings-store");
  await planSettingsStore.reload();
  const { result } = renderHook(usePlanSettings);
  let first!: Promise<unknown>;
  let second!: Promise<unknown>;
  act(() => {
    first = planSettingsStore.updatePageDesign("frontCover", { title: "First title" });
    second = planSettingsStore.updatePageDesign("frontCover", { title: "Final title" });
  });
  await waitFor(() => expect(clinicApi.planSettings.update).toHaveBeenCalledTimes(1));
  expect(result.current.pageDesign.frontCover.title).toBe("Final title");
  await act(async () => { finishFirst({}); await first; await second; });
  expect(clinicApi.planSettings.update).toHaveBeenLastCalledWith(expect.objectContaining({
    page_design: expect.objectContaining({ front_cover: expect.objectContaining({ title: "Final title" }) }),
  }));
});

it("loads and saves the uploaded header logo and clears a removed cover", async () => {
  vi.resetModules();
  const { clinicApi } = await import("@/lib/admin/api");
  vi.mocked(clinicApi.planSettings.get).mockResolvedValue({
    page_design: { inner_pages: { logo: "/storage/plan-settings/1/logo.png" }, front_cover: { cover_image: "/storage/plan-settings/1/cover.jpg" } },
  });
  vi.mocked(clinicApi.planSettings.update).mockResolvedValue({});
  const { planSettingsStore, usePlanSettings } = await import("./plan-settings-store");
  await planSettingsStore.reload();
  const { result } = renderHook(usePlanSettings);
  expect(result.current.pageDesign.innerPages.logo).toBe("/storage/plan-settings/1/logo.png");
  await act(async () => { await planSettingsStore.updatePageDesign("frontCover", { coverImage: undefined }); });
  expect(clinicApi.planSettings.update).toHaveBeenLastCalledWith(expect.objectContaining({
    page_design: expect.objectContaining({
      front_cover: expect.objectContaining({ cover_image: null }),
      inner_pages: expect.objectContaining({ logo: "/storage/plan-settings/1/logo.png" }),
    }),
  }));
});

it("reports a failed save, keeps edits and allows a successful retry", async () => {
  vi.resetModules();
  const { clinicApi } = await import("@/lib/admin/api");
  const { toast } = await import("sonner");
  vi.mocked(clinicApi.planSettings.get).mockResolvedValue({ page_size: "A4" });
  vi.mocked(clinicApi.planSettings.update).mockRejectedValueOnce(new Error("Server unavailable")).mockResolvedValue({});
  const { planSettingsStore, usePlanSettings } = await import("./plan-settings-store");
  await planSettingsStore.reload();
  const { result } = renderHook(usePlanSettings);
  await act(async () => {
    await expect(planSettingsStore.update({ pageSize: "Letter" })).rejects.toThrow("Server unavailable");
  });
  expect(toast.error).toHaveBeenCalledWith("Server unavailable");
  expect(result.current.pageSize).toBe("Letter");
  await act(async () => { await planSettingsStore.update({}); });
  expect(clinicApi.planSettings.update).toHaveBeenLastCalledWith(expect.objectContaining({ page_size: "Letter" }));
});
