import { describe, expect, it } from "vitest";
import { calculatePaymentPlan } from "@/lib/payment-plan";

describe("calculatePaymentPlan", () => {
  it("adds the percentage to the principal before splitting it into installments", () => {
    expect(calculatePaymentPlan(1000, 2, 10)).toEqual({
      monthly: 550,
      totalInterest: 100,
      totalPaid: 1100,
      term: 2,
    });
  });

  it("handles a zero rate and prevents division by zero", () => {
    expect(calculatePaymentPlan(1000, 0, 0)).toEqual({
      monthly: 1000,
      totalInterest: 0,
      totalPaid: 1000,
      term: 1,
    });
  });
});
