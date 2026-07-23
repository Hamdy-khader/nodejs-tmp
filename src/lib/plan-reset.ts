import { defaultTeeth, type TreatmentPlan } from "@/lib/patients-store";

type PlanPatch = Partial<Omit<TreatmentPlan, "id" | "patientId" | "createdAt">>;

export function diagnosisResetPatch(): PlanPatch {
  return { teeth: defaultTeeth(), generalStatuses: [] };
}

export function treatmentResetPatch(): PlanPatch {
  return {
    treatments: [],
    treatmentNote: undefined,
    billingMode: undefined,
    insurance: undefined,
    paymentPlan: undefined,
  };
}
