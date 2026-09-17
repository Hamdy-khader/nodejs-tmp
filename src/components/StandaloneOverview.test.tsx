import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StandaloneOverview } from "./StandaloneOverview";
import { useTabs } from "@/lib/tabs-store";

vi.mock("@/lib/tabs-store", () => ({ useTabs: vi.fn() }));
vi.mock("@/lib/use-hydrated", () => ({ useHydrated: () => true }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("./TreatmentPlanWorkspace", () => ({
  TreatmentPlanWorkspace: ({ patientId, planId, initialStep }: {
    patientId: string; planId: string; initialStep: string;
  }) => <div data-testid="workspace">{patientId}/{planId}/{initialStep}</div>,
}));

const first = { patientId: "patient-1", name: "First patient", planId: "plan-1", planName: "First plan" };
const second = { patientId: "patient-2", name: "Second patient", planId: "plan-2", planName: "Second plan" };
afterEach(cleanup);

describe("StandaloneOverview", () => {
  it("offers patient selection instead of a sample report when no plan is open", () => {
    vi.mocked(useTabs).mockReturnValue([]);
    render(<StandaloneOverview />);
    expect(screen.getByText("All patients")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("opens the only available plan at the overview step", () => {
    vi.mocked(useTabs).mockReturnValue([first]);
    render(<StandaloneOverview />);
    expect(screen.getByTestId("workspace")).toHaveTextContent("patient-1/plan-1/overview");
  });

  it("requires an explicit choice among multiple plans and stops displaying a closed plan", () => {
    vi.mocked(useTabs).mockReturnValue([first, second]);
    const { rerender } = render(<StandaloneOverview />);
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Treatment plan"), { target: { value: "plan-2" } });
    expect(screen.getByTestId("workspace")).toHaveTextContent("patient-2/plan-2/overview");
    fireEvent.change(screen.getByLabelText("Treatment plan"), { target: { value: "plan-1" } });
    expect(screen.getByTestId("workspace")).toHaveTextContent("patient-1/plan-1/overview");
    vi.mocked(useTabs).mockReturnValue([second]);
    rerender(<StandaloneOverview />);
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });
});
