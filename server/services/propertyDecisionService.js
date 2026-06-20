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

export class ValidationError extends Error {
  constructor(errors) {
    super('Invalid property analysis request');
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

const numericRules = {
  purchasePrice: { min: 1000, max: 100000000 },
  estimatedValue: { min: 1000, max: 100000000 },
  repairCost: { min: 0, max: 10000000 },
  interestRate: { min: 0, max: 30 },
  loanTermYears: { min: 1, max: 40 },
  monthlyRent: { min: 0, max: 1000000 },
  monthlyExpenses: { min: 0, max: 1000000 },
  vacancyRate: { min: 0, max: 100 }
};

function validateNumber(input, field, { min, max }) {
  const value = input[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { value: null, error: `${field} must be a finite number.` };
  }
  if (value < min || value > max) {
    return { value: null, error: `${field} must be between ${min} and ${max}.` };
  }
  return { value, error: null };
}

export function validatePropertyInput(input = {}) {
  const errors = [];
  const values = {};

  for (const [field, rule] of Object.entries(numericRules)) {
    const result = validateNumber(input, field, rule);
    if (result.error) {
      errors.push(result.error);
    } else {
      values[field] = result.value;
    }
  }

  const downPaymentResult = validateNumber(input, 'downPayment', {
    min: 0,
    max: values.purchasePrice ?? 100000000
  });
  if (downPaymentResult.error) {
    errors.push('downPayment must be a finite number between 0 and purchasePrice.');
  } else {
    values.downPayment = downPaymentResult.value;
  }

  if (
    Number.isFinite(values.downPayment)
    && Number.isFinite(values.purchasePrice)
    && values.downPayment > values.purchasePrice
  ) {
    errors.push('downPayment cannot be greater than purchasePrice.');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return values;
}

export function buildPropertyDecision(input) {
  const validated = validatePropertyInput(input);
  const purchasePrice = validated.purchasePrice;
  const estimatedValue = validated.estimatedValue;
  const downPayment = validated.downPayment;
  const loanAmount = Math.max(purchasePrice - downPayment, 0);
  const repairCost = validated.repairCost;
  const monthlyRent = validated.monthlyRent;
  const monthlyExpenses = validated.monthlyExpenses;
  const vacancyRate = validated.vacancyRate;
  const loanYears = validated.loanTermYears;
  const loanRate = validated.interestRate;
  const neighborhoodScore = Math.max(0, Math.min(100, Number(input.neighborhoodScore) || 0));
  const effectiveMonthlyRent = monthlyRent * (1 - vacancyRate / 100);

  const mortgage = monthlyMortgage(loanAmount, loanRate, loanYears);
  const monthlyCashFlow = effectiveMonthlyRent - monthlyExpenses - mortgage;
  const annualNoi = Math.max((effectiveMonthlyRent - monthlyExpenses) * 12, 0);
  const totalCashInvested = Math.max(downPayment + repairCost, 1);
  const capRate = estimatedValue > 0 ? (annualNoi / estimatedValue) * 100 : 0;
  const cashOnCashReturn = (monthlyCashFlow * 12 / totalCashInvested) * 100;
  const equityPercent = purchasePrice > 0 ? (downPayment / purchasePrice) * 100 : 0;

  let score = 45;
  score += Math.min(Math.max(monthlyCashFlow / 35, -18), 22);
  score += Math.min(Math.max(cashOnCashReturn * 1.8, -18), 20);
  score += Math.min(Math.max((capRate - 4) * 4, -12), 18);
  score += Math.min(Math.max((neighborhoodScore - 50) / 2.7, -16), 16);
  score += equityPercent >= 20 ? 6 : -4;
  score -= repairCost > purchasePrice * 0.08 ? 5 : 0;
  score -= vacancyRate > 12 ? 4 : 0;

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
      vacancyRate,
      estimatedValue,
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
