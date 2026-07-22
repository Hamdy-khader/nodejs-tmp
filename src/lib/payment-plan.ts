export interface PaymentPlanCalculation {
  monthly: number;
  totalInterest: number;
  totalPaid: number;
  term: number;
}

export function calculatePaymentPlan(
  amount: number,
  term: number,
  interestRate: number,
): PaymentPlanCalculation {
  const principal = Math.max(0, amount);
  const safeTerm = Math.max(1, term);
  const rate = Math.max(0, interestRate) / 100;
  const totalInterest = principal * rate;
  const totalPaid = principal + totalInterest;

  return {
    monthly: totalPaid / safeTerm,
    totalInterest,
    totalPaid,
    term: safeTerm,
  };
}
