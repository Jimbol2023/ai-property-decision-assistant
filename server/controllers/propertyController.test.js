import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeProperty } from './propertyController.js';

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

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('invalid property request returns a clear 400 response', async () => {
  const response = createMockResponse();
  await analyzeProperty(
    { body: { ...validRequest, downPayment: 400000 } },
    response,
    (error) => {
      throw error;
    }
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Invalid property analysis request');
  assert.ok(response.body.errors.includes('downPayment must be a finite number between 0 and purchasePrice.'));
});

test('valid property request returns analysis response', async () => {
  const response = createMockResponse();
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  await analyzeProperty(
    { body: validRequest },
    response,
    (error) => {
      throw error;
    }
  );

  if (previousKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = previousKey;
  }

  assert.equal(response.statusCode, 200);
  assert.ok(['Strong Buy', 'Watch Closely', 'Pass'].includes(response.body.recommendation));
  assert.equal(typeof response.body.metrics.monthlyCashFlow, 'number');
});
