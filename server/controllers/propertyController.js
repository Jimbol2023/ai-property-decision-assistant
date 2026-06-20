import { ValidationError, buildPropertyDecision } from '../services/propertyDecisionService.js';
import { enhanceWithAi } from '../services/optionalAiService.js';

export async function analyzeProperty(request, response, next) {
  try {
    const decision = buildPropertyDecision(request.body || {});
    const aiNote = await enhanceWithAi(request.body || {}, decision);
    response.json({ ...decision, aiNote });
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
}
