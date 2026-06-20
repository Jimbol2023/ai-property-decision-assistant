import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertAnalysisHistory,
  insertRecommendation,
  normalizePropertyIdentity,
  upsertProperty
} from './propertyRepository.js';
import { buildPropertyDecision } from '../services/propertyDecisionService.js';

const validRequest = {
  address: '742 Magnolia Ave, Tampa, FL',
  propertyType: 'Single-family rental',
  purchasePrice: 365000,
  estimatedValue: 385000,
  downPayment: 73000,
  interestRate: 6.75,
  loanTermYears: 30,
  monthlyRent: 2850,
  monthlyExpenses: 920,
  repairCost: 18000,
  vacancyRate: 6,
  neighborhoodScore: 78,
  riskTolerance: 'Moderate',
  goal: 'Balanced cash flow and appreciation'
};

function createFakeClient() {
  const propertyIds = new Map();
  const analyses = [];
  const recommendations = [];

  return {
    analyses,
    recommendations,
    async query(sql, params) {
      if (sql.includes('insert into properties')) {
        const key = `${params[1]}|${params[2]}`;
        if (!propertyIds.has(key)) {
          propertyIds.set(key, propertyIds.size + 1);
        }
        return { rows: [{ id: propertyIds.get(key) }], rowCount: 1 };
      }

      if (sql.includes('insert into analysis_history')) {
        const id = analyses.length + 1;
        analyses.push({ id, propertyId: params[0], inputSnapshot: JSON.parse(params[1]) });
        return { rows: [{ id }], rowCount: 1 };
      }

      if (sql.includes('insert into recommendations')) {
        const id = recommendations.length + 1;
        recommendations.push({ id, analysisId: params[0], recommendation: params[1], score: params[2] });
        return { rows: [{ id }], rowCount: 1 };
      }

      throw new Error(`Unexpected SQL in fake client: ${sql}`);
    }
  };
}

test('normalizes property identity from address and property type', () => {
  assert.deepEqual(
    normalizePropertyIdentity({ address: ' 742  Magnolia Ave ', propertyType: ' Duplex ' }),
    { normalizedAddress: '742 magnolia ave', propertyType: 'duplex' }
  );
});

test('property upsert deduplicates by normalized address and property type', async () => {
  const client = createFakeClient();
  const firstId = await upsertProperty(client, validRequest);
  const secondId = await upsertProperty(client, {
    ...validRequest,
    address: '  742   MAGNOLIA ave, tampa, fl '
  });

  assert.equal(firstId, secondId);
});

test('repeated analysis creates a new history row', async () => {
  const client = createFakeClient();
  const decision = buildPropertyDecision(validRequest);
  const propertyId = await upsertProperty(client, validRequest);

  const firstAnalysisId = await insertAnalysisHistory(client, propertyId, validRequest, decision);
  const secondAnalysisId = await insertAnalysisHistory(client, propertyId, validRequest, decision);

  assert.equal(firstAnalysisId, 1);
  assert.equal(secondAnalysisId, 2);
  assert.equal(client.analyses.length, 2);
});

test('recommendation links to correct analysis', async () => {
  const client = createFakeClient();
  const decision = buildPropertyDecision(validRequest);

  const recommendationId = await insertRecommendation(client, 42, { ...decision, aiNote: 'AI note' });

  assert.equal(recommendationId, 1);
  assert.equal(client.recommendations[0].analysisId, 42);
  assert.equal(client.recommendations[0].recommendation, decision.recommendation);
});
