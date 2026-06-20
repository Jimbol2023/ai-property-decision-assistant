import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPropertyDecision } from './propertyDecisionService.js';

test('builds a structured property decision', () => {
  const decision = buildPropertyDecision({
    purchasePrice: 365000,
    downPayment: 73000,
    loanRate: 6.75,
    loanYears: 30,
    monthlyRent: 2850,
    monthlyExpenses: 920,
    repairs: 18000,
    neighborhoodScore: 78
  });

  assert.ok(['Strong Buy', 'Watch Closely', 'Pass'].includes(decision.recommendation));
  assert.equal(typeof decision.score, 'number');
  assert.equal(typeof decision.metrics.monthlyCashFlow, 'number');
  assert.ok(Array.isArray(decision.risks));
  assert.ok(Array.isArray(decision.nextSteps));
});
