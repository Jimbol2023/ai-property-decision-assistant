function money(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function round(value, digits = 1) {
  return Number.parseFloat(value.toFixed(digits));
}

function monthlyMortgage(principal, annualRate, years) {
  if (principal <= 0) return 0;
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * (monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

export function buildPropertyDecision(input) {
  const purchasePrice = money(input.purchasePrice);
  const downPayment = money(input.downPayment);
  const loanAmount = Math.max(purchasePrice - downPayment, 0);
  const repairs = money(input.repairs);
  const monthlyRent = money(input.monthlyRent);
  const monthlyExpenses = money(input.monthlyExpenses);
  const loanYears = Number(input.loanYears) || 30;
  const loanRate = Number(input.loanRate) || 0;
  const neighborhoodScore = Math.max(0, Math.min(100, Number(input.neighborhoodScore) || 0));

  const mortgage = monthlyMortgage(loanAmount, loanRate, loanYears);
  const monthlyCashFlow = monthlyRent - monthlyExpenses - mortgage;
  const annualNoi = Math.max((monthlyRent - monthlyExpenses) * 12, 0);
  const totalCashInvested = Math.max(downPayment + repairs, 1);
  const capRate = purchasePrice > 0 ? (annualNoi / purchasePrice) * 100 : 0;
  const cashOnCashReturn = (monthlyCashFlow * 12 / totalCashInvested) * 100;
  const equityPercent = purchasePrice > 0 ? (downPayment / purchasePrice) * 100 : 0;

  let score = 45;
  score += Math.min(Math.max(monthlyCashFlow / 35, -18), 22);
  score += Math.min(Math.max(cashOnCashReturn * 1.8, -18), 20);
  score += Math.min(Math.max((capRate - 4) * 4, -12), 18);
  score += Math.min(Math.max((neighborhoodScore - 50) / 2.7, -16), 16);
  score += equityPercent >= 20 ? 6 : -4;
  score -= repairs > purchasePrice * 0.08 ? 5 : 0;

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const recommendation = normalizedScore >= 72 ? 'Strong Buy' : normalizedScore >= 55 ? 'Watch Closely' : 'Pass';
  const risks = [];

  if (monthlyCashFlow < 0) risks.push('Negative projected cash flow leaves little room for vacancies or repairs.');
  if (cashOnCashReturn < 6) risks.push('Cash-on-cash return is below a common long-term rental target.');
  if (capRate < 5) risks.push('Cap rate is thin relative to the purchase price and operating costs.');
  if (neighborhoodScore < 65) risks.push('Neighborhood strength may limit rent growth or resale upside.');
  if (loanRate >= 7) risks.push('Financing costs are creating meaningful pressure on returns.');
  if (risks.length === 0) risks.push('Primary assumptions are healthy; verify taxes, insurance, and rent comps before offering.');

  return {
    recommendation,
    score: normalizedScore,
    summary: recommendation === 'Strong Buy'
      ? 'The deal clears the main return and risk checks.'
      : recommendation === 'Watch Closely'
        ? 'The deal has promise, but key assumptions need validation.'
        : 'The current numbers do not justify the risk profile.',
    metrics: {
      monthlyMortgage: Math.round(mortgage),
      monthlyCashFlow: Math.round(monthlyCashFlow),
      cashOnCashReturn: round(cashOnCashReturn),
      capRate: round(capRate),
      equityPercent: round(equityPercent),
      neighborhoodScore
    },
    risks,
    nextSteps: [
      'Confirm rent comps within a half-mile radius.',
      'Get insurance, tax, and repair quotes before submitting an offer.',
      'Stress test vacancy and maintenance reserves.',
      'Compare the result against at least two alternate properties.'
    ]
  };
}
