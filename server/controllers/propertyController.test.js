import assert from 'node:assert/strict';
import test from 'node:test';
import { createPropertyController } from './propertyController.js';
import { buildPropertyDecision } from '../services/propertyDecisionService.js';

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
  let persistCalls = 0;
  const controller = createPropertyController({
    savePropertyAnalysis: async () => {
      persistCalls += 1;
    }
  });

  await controller.analyzeProperty(
    { body: { ...validRequest, downPayment: 400000 } },
    response,
    (error) => {
      throw error;
    }
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Invalid property analysis request');
  assert.ok(response.body.errors.includes('downPayment must be a finite number between 0 and purchasePrice.'));
  assert.equal(persistCalls, 0);
});

test('valid property request persists and returns analysis response with ids', async () => {
  const response = createMockResponse();
  let savedInput;
  const controller = createPropertyController({
    enhanceWithAi: async () => 'AI note',
    savePropertyAnalysis: async (input, decision, aiNote) => {
      savedInput = input;
      return {
        ...decision,
        aiNote,
        propertyId: 11,
        analysisId: 22,
        recommendationId: 33
      };
    }
  });

  await controller.analyzeProperty(
    { body: validRequest },
    response,
    (error) => {
      throw error;
    }
  );

  assert.equal(response.statusCode, 200);
  assert.ok(['Strong Buy', 'Watch Closely', 'Pass'].includes(response.body.recommendation));
  assert.equal(typeof response.body.metrics.monthlyCashFlow, 'number');
  assert.equal(response.body.aiNote, 'AI note');
  assert.equal(response.body.propertyId, 11);
  assert.equal(response.body.analysisId, 22);
  assert.equal(response.body.recommendationId, 33);
  assert.deepEqual(savedInput, validRequest);
});

test('properties endpoint returns saved property list', async () => {
  const response = createMockResponse();
  const controller = createPropertyController({
    listProperties: async () => [{
      id: 11,
      address: validRequest.address,
      propertyType: validRequest.propertyType,
      latestRecommendation: 'Strong Buy',
      latestScore: 82
    }]
  });

  await controller.getProperties({}, response, (error) => {
    throw error;
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.properties.length, 1);
  assert.equal(response.body.properties[0].latestRecommendation, 'Strong Buy');
});

test('property analysis history endpoint returns saved analyses', async () => {
  const response = createMockResponse();
  const controller = createPropertyController({
    listAnalysisHistory: async (propertyId) => [{
      id: 22,
      propertyId,
      recommendation: 'Watch Closely',
      score: 65
    }]
  });

  await controller.getPropertyAnalysisHistory(
    { params: { propertyId: '11' } },
    response,
    (error) => {
      throw error;
    }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.analyses.length, 1);
  assert.equal(response.body.analyses[0].propertyId, 11);
});

test('analysis history item endpoint returns saved result shape', async () => {
  const response = createMockResponse();
  const decision = buildPropertyDecision(validRequest);
  const controller = createPropertyController({
    getAnalysisById: async (analysisId) => ({
      id: analysisId,
      propertyId: 11,
      inputSnapshot: validRequest,
      metrics: decision.metrics,
      risks: decision.risks,
      nextSteps: decision.nextSteps,
      recommendationId: 33,
      recommendation: decision.recommendation,
      score: decision.score,
      summary: decision.summary,
      aiNote: 'AI note',
      createdAt: '2026-06-20T18:00:00.000Z'
    })
  });

  await controller.getAnalysisHistoryItem(
    { params: { analysisId: '22' } },
    response,
    (error) => {
      throw error;
    }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.analysisId, 22);
  assert.equal(response.body.propertyId, 11);
  assert.deepEqual(response.body.inputSnapshot, validRequest);
});
