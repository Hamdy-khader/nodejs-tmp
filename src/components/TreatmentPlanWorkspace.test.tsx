import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { defaultTeeth, patientsStore, usePatient, usePlan } from "@/lib/patients-store";
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
vi.mock("@/components/TeethChart", () => ({
  TeethChart: ({ onSelect, highlighted }: { onSelect: (n: number) => void; highlighted: number[] }) => (
    <div>
      {[12, 13].map(n => <button key={n} data-tooth-number={n} onClick={() => onSelect(n)}>Chart {n}</button>)}
      <output data-testid="selected">{highlighted.join(",")}</output>
    </div>
  ),
}));
afterEach(cleanup);

it("selects several diagnosis teeth by default and clears them outside", () => {
  vi.mocked(usePatient).mockReturnValue({ id: "patient", name: "Patient", createdAt: 0 });
  vi.mocked(usePlan).mockReturnValue({ id: "plan", patientId: "patient", name: "Plan", notes: "", teeth: defaultTeeth(), createdAt: 0, updatedAt: 0 });
  render(<TreatmentPlanWorkspace patientId="patient" planId="plan" />);
  for (const n of [12, 13]) {
    fireEvent.pointerDown(screen.getByText(`Chart ${n}`));
    fireEvent.click(screen.getByText(`Chart ${n}`));
  }
  expect(screen.getByTestId("selected")).toHaveTextContent("12,13");
  const missing = screen.getByRole("button", { name: "Missing" });
  fireEvent.pointerDown(missing);
  fireEvent.click(missing);
  expect(patientsStore.updatePlan).toHaveBeenCalledWith("plan", expect.objectContaining({
    teeth: expect.objectContaining({ 12: expect.objectContaining({ status: "missing" }), 13: expect.objectContaining({ status: "missing" }) }),
  }));
  fireEvent.pointerDown(document.body);
  expect(screen.getByTestId("selected")).toBeEmptyDOMElement();
});
