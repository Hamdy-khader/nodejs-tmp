import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTabs } from "@/lib/tabs-store";
import { useHydrated } from "@/lib/use-hydrated";
import { TreatmentPlanWorkspace } from "@/components/TreatmentPlanWorkspace";

export function StandaloneOverview() {
  const tabs = useTabs();
  const hydrated = useHydrated();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const planTabs = tabs.filter((tab) => tab.planId);
  const selectedTab = selectedPlanId
    ? planTabs.find((tab) => tab.planId === selectedPlanId)
    : planTabs.length === 1 ? planTabs[0] : undefined;

  if (!hydrated) return <div className="p-8" />;

  return (
    <div className="w-full min-w-0 bg-muted/30">
      {planTabs.length > 0 && (
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 p-3 sm:px-5">
          <label htmlFor="overview-plan" className="text-sm font-medium">Treatment plan</label>
          <select
            id="overview-plan"
            value={selectedTab?.planId ?? ""}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            className="h-9 max-w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>Select a treatment plan</option>
            {planTabs.map((tab) => (
              <option key={tab.planId} value={tab.planId}>
                {tab.name} — {tab.planName || "Treatment plan"}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedTab?.planId ? (
        <TreatmentPlanWorkspace
          key={`${selectedTab.patientId}:${selectedTab.planId}`}
          patientId={selectedTab.patientId}
          planId={selectedTab.planId}
          initialStep="overview"
        />
      ) : (
        <div className="mx-auto max-w-[1600px] p-8">
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {planTabs.length > 0
              ? "Select a treatment plan to preview its report."
              : "Open a patient's treatment plan to preview its report here."}
          </p>
          <Link to="/patients" className="mt-4 inline-block text-sm text-primary underline">
            All patients
          </Link>
        </div>
      )}
    </div>
  );
}
