import { ValidationError, buildPropertyDecision } from '../services/propertyDecisionService.js';
import { enhanceWithAi } from '../services/optionalAiService.js';
import {
  getAnalysisById,
  listAnalysisHistory,
  listProperties,
  savePropertyAnalysis
} from '../repositories/propertyRepository.js';

const defaultDependencies = {
  buildPropertyDecision,
  enhanceWithAi,
  savePropertyAnalysis,
  listProperties,
  listAnalysisHistory,
  getAnalysisById
};

function savedAnalysisToResult(analysis) {
  return {
    recommendation: analysis.recommendation,
    score: analysis.score,
    summary: analysis.summary,
    metrics: analysis.metrics,
    risks: analysis.risks,
    nextSteps: analysis.nextSteps,
    aiNote: analysis.aiNote,
    propertyId: analysis.propertyId,
    analysisId: analysis.id,
    recommendationId: analysis.recommendationId,
    inputSnapshot: analysis.inputSnapshot,
    createdAt: analysis.createdAt
  };
}

export function createPropertyController(dependencies = {}) {
  const services = { ...defaultDependencies, ...dependencies };

  return {
    async analyzeProperty(request, response, next) {
      try {
        const input = request.body || {};
        const decision = services.buildPropertyDecision(input);
        const aiNote = await services.enhanceWithAi(input, decision);
        const savedResult = await services.savePropertyAnalysis(input, decision, aiNote);
        response.json(savedResult);
      } catch (error) {
        if (error instanceof ValidationError) {
          response.status(400).json({
            message: 'Invalid property analysis request',
            errors: error.errors
          });
          return;
        }
        next(error);
      }
    },

    async getProperties(_request, response, next) {
      try {
        response.json({ properties: await services.listProperties() });
      } catch (error) {
        next(error);
      }
    },

    async getPropertyAnalysisHistory(request, response, next) {
      try {
        const propertyId = Number(request.params.propertyId);
        if (!Number.isInteger(propertyId) || propertyId < 1) {
          response.status(400).json({ message: 'propertyId must be a positive integer.' });
          return;
        }

        response.json({ analyses: await services.listAnalysisHistory(propertyId) });
      } catch (error) {
        next(error);
      }
    },

    async getAnalysisHistoryItem(request, response, next) {
      try {
        const analysisId = Number(request.params.analysisId);
        if (!Number.isInteger(analysisId) || analysisId < 1) {
          response.status(400).json({ message: 'analysisId must be a positive integer.' });
          return;
        }

        const analysis = await services.getAnalysisById(analysisId);
        if (!analysis) {
          response.status(404).json({ message: 'Analysis history item not found.' });
          return;
        }

        response.json(savedAnalysisToResult(analysis));
      } catch (error) {
        next(error);
      }
    }
  };
}

const controller = createPropertyController();

export const analyzeProperty = controller.analyzeProperty;
export const getProperties = controller.getProperties;
export const getPropertyAnalysisHistory = controller.getPropertyAnalysisHistory;
export const getAnalysisHistoryItem = controller.getAnalysisHistoryItem;
