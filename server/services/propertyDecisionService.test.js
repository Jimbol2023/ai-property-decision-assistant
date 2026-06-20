import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError, buildPropertyDecision } from './propertyDecisionService.js';

const validRequest = {
    purchasePrice: 365000,
    estimatedValue: 385000,
    downPayment: 73000,
    interestRate: 6.75,
    loanTermYears: 30,
    monthlyRent: 2850,
    monthlyExpenses: 920,
    repairCost: 18000,
    vacancyRate: 6,
    neighborhoodScore: 78
};

test('valid request builds a structured property decision', () => {
  const decision = buildPropertyDecision(validRequest);

  assert.ok(['Strong Buy', 'Watch Closely', 'Pass'].includes(decision.recommendation));
  assert.equal(typeof decision.score, 'number');
  assert.equal(typeof decision.metrics.monthlyCashFlow, 'number');
  assert.equal(Number.isFinite(decision.metrics.monthlyCashFlow), true);
  assert.equal(Number.isFinite(decision.metrics.cashOnCashReturn), true);
  assert.equal(Number.isFinite(decision.metrics.capRate), true);
  assert.ok(Array.isArray(decision.risks));
  assert.ok(Array.isArray(decision.nextSteps));
});

test('rejects downPayment greater than purchasePrice', () => {
  assert.throws(
    () => buildPropertyDecision({ ...validRequest, downPayment: 400000 }),
    (error) => error instanceof ValidationError
      && error.statusCode === 400
      && error.errors.includes('downPayment must be a finite number between 0 and purchasePrice.')
  );
});

test('rejects extreme interest rate', () => {
  assert.throws(
    () => buildPropertyDecision({ ...validRequest, interestRate: 31 }),
    (error) => error instanceof ValidationError
      && error.statusCode === 400
      && error.errors.includes('interestRate must be between 0 and 30.')
  );
});

test('rejects non-numeric values', () => {
  assert.throws(
    () => buildPropertyDecision({ ...validRequest, monthlyRent: 'not a number' }),
    (error) => error instanceof ValidationError
      && error.statusCode === 400
      && error.errors.includes('monthlyRent must be a finite number.')
  );
});
