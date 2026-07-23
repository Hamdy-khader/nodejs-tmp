import { describe, expect, it } from "vitest";
import { diagnosisResetPatch, treatmentResetPatch } from "@/lib/plan-reset";

describe("contextual plan reset", () => {
  it("clears diagnosis data without touching treatments", () => {
    const patch = diagnosisResetPatch();
    expect(patch.generalStatuses).toEqual([]);
    expect(Object.values(patch.teeth ?? {}).every((tooth) => tooth.status === "intact")).toBe(true);
    expect(patch).not.toHaveProperty("treatments");
    expect(patch).not.toHaveProperty("treatmentNote");
  });

  it("clears suggested-treatment notes and billing without touching diagnosis", () => {
    const patch = treatmentResetPatch();
    expect(patch).toMatchObject({ treatments: [] });
    expect(patch).toHaveProperty("treatmentNote", undefined);
    expect(patch).toHaveProperty("insurance", undefined);
    expect(patch).toHaveProperty("paymentPlan", undefined);
    expect(patch).not.toHaveProperty("teeth");
    expect(patch).not.toHaveProperty("generalStatuses");
  });
});
