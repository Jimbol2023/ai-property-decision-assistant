import { Router } from 'express';
import {
  analyzeProperty,
  getAnalysisHistoryItem,
  getProperties,
  getPropertyAnalysisHistory
} from '../controllers/propertyController.js';

const router = Router();

router.post('/analyze-property', analyzeProperty);
router.get('/properties', getProperties);
router.get('/properties/:propertyId/analysis-history', getPropertyAnalysisHistory);
router.get('/analysis-history/:analysisId', getAnalysisHistoryItem);

export default router;
