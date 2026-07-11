import type { Clinic } from "@/lib/admin/api";
import type { TreatmentPlan } from "@/lib/patients-store";
import type { PlanSettings } from "@/lib/plan-settings-store";

export const DEFAULT_COVER_IMAGE = "/default-plan-cover.svg";

export interface PdfExportContext {
  clinicName: string;
  patientName: string;
  treatmentNumber: string;
}

export function buildPdfExportContext(args: {
  clinic: Clinic | null;
  patientName?: string;
  plan: TreatmentPlan;
  settings: PlanSettings;
}): PdfExportContext {
  const { clinic, patientName, plan, settings } = args;

  return {
    clinicName:
      clinic?.name?.trim() ||
      settings.pageDesign.frontCover.clinicName.trim() ||
      "Clinic",
    patientName: patientName?.trim() || "Patient",
    treatmentNumber: String(plan.id ?? "").trim(),
  };
}

export function resolveTemplate(input: string | undefined, context: PdfExportContext) {
  if (!input) return "";

  return input
    .replace(/\{\{\s*clinic_name\s*\}\}/gi, context.clinicName)
    .replace(/\{\{\s*patient_name\s*\}\}/gi, context.patientName)
    .replace(/\{\{\s*treatment_number\s*\}\}/gi, context.treatmentNumber);
}

export function buildFooterSegments(context: PdfExportContext) {
  const segments = [`Clinic: ${context.clinicName}`, `Patient: ${context.patientName}`];
  if (context.treatmentNumber) segments.push(`Treatment: ${context.treatmentNumber}`);
  return segments;
}

export function resolveCoverImage(coverImage?: string) {
  const value = coverImage?.trim();
  return value || DEFAULT_COVER_IMAGE;
}
