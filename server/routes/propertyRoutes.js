import { Router } from 'express';
import { analyzeProperty } from '../controllers/propertyController.js';

const router = Router();

router.post('/analyze-property', analyzeProperty);

export default router;
