import { createFileRoute } from "@tanstack/react-router";
import { TreatmentPlanWorkspace } from "@/components/TreatmentPlanWorkspace";

export const Route = createFileRoute("/patients/$patientId/plans/$planId")({
  component: PlanPage,
  notFoundComponent: () => <div className="p-8">Plan not found</div>,
});

function PlanPage() {
  const { patientId, planId } = Route.useParams();
  return <TreatmentPlanWorkspace key={planId} patientId={patientId} planId={planId} />;
}
