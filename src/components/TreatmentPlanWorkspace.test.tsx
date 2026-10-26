import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultTeeth, patientsStore, usePatient, usePlan, type TreatmentPlan } from "@/lib/patients-store";
import { TreatmentPlanWorkspace } from "./TreatmentPlanWorkspace";

vi.mock("@/lib/patients-store", async (original) => ({
  ...await original<typeof import("@/lib/patients-store")>(),
  usePatient: vi.fn(), usePlan: vi.fn(), usePlansFor: vi.fn(),
  patientsStore: { updatePlan: vi.fn(), setTooth: vi.fn() },
}));
vi.mock("@/lib/tabs-store", () => ({ tabsStore: { open: vi.fn() } }));
vi.mock("@/lib/use-hydrated", () => ({ useHydrated: () => true }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(), Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
afterEach(cleanup);

const basePlan = (): TreatmentPlan => ({
  id: "plan", patientId: "patient", name: "Plan", notes: "", teeth: defaultTeeth(), createdAt: 0, updatedAt: 0,
});

beforeEach(() => {
  vi.mocked(patientsStore.updatePlan).mockClear();
  vi.mocked(usePatient).mockReturnValue({ id: "patient", name: "Patient", createdAt: 0 });
  vi.mocked(usePlan).mockReturnValue(basePlan());
});

const chartTooth = (n: number) => screen.getByRole("button", { name: `Tooth ${n}` });

it("applies a status to every selected tooth and then clears the selection", () => {
  render(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  fireEvent.click(chartTooth(12));
  fireEvent.click(chartTooth(13));
  expect(chartTooth(12)).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Missing" }));
  expect(patientsStore.updatePlan).toHaveBeenCalledWith("plan", expect.objectContaining({
    teeth: expect.objectContaining({
      12: expect.objectContaining({ status: "missing" }),
      13: expect.objectContaining({ status: "missing" }),
    }),
  }));
  expect(chartTooth(12)).toHaveAttribute("aria-pressed", "false");
});

it("stacks a crown on a root treated tooth and files it", () => {
  render(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  fireEvent.click(chartTooth(16));
  fireEvent.click(screen.getByRole("button", { name: "Root treated" }));
  const afterRct = vi.mocked(patientsStore.updatePlan).mock.calls.at(-1)![1];
  vi.mocked(usePlan).mockReturnValue({ ...basePlan(), ...afterRct });
  cleanup();
  render(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  fireEvent.click(chartTooth(16));
  fireEvent.click(screen.getByRole("button", { name: "Crown" }));
  const patch = vi.mocked(patientsStore.updatePlan).mock.calls.at(-1)![1];
  expect(patch.teeth?.[16].statuses?.map((entry) => entry.stateId)).toEqual([201, 19, 9]);
});

it("opens the details of the applied status and stores the picked surfaces", async () => {
  const { rerender } = render(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  fireEvent.click(chartTooth(16));
  fireEvent.keyDown(screen.getByRole("button", { name: "Filled (amalgam) options" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Filled (composite)" }));
  expect(chartTooth(16)).toHaveAttribute("aria-pressed", "false");
  const applied = vi.mocked(patientsStore.updatePlan).mock.calls.at(-1)![1];
  vi.mocked(usePlan).mockReturnValue({ ...basePlan(), ...applied });
  rerender(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  expect(screen.getByText("Secunder caries")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("M"));
  fireEvent.click(screen.getByLabelText("Leaking"));
  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  const patch = vi.mocked(patientsStore.updatePlan).mock.calls.at(-1)![1];
  expect(patch.teeth?.[16].statuses?.find((entry) => entry.stateId === 5)).toMatchObject({
    title: "Filled (composite) - M, Leaking",
    extraDiagnosis: "M,Leaking",
  });
});

it("puts a whole-mouth finding in the general row when no tooth is selected", () => {
  render(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  fireEvent.keyDown(screen.getByRole("button", { name: "General options" }), { key: "ArrowDown" });
  return screen.findByRole("menuitem", { name: "Malocclusion" }).then((item) => {
    fireEvent.click(item);
    expect(patientsStore.updatePlan).toHaveBeenCalledWith("plan", expect.objectContaining({
      generalStatuses: ["Malocclusion"],
    }));
  });
});
