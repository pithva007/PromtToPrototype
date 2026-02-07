import express from 'express';
import { analyzeUrl } from '../controllers/analyzeUrl.controller';
import { apiRateLimiter } from '../middleware/rateLimiter.middleware';

const router = express.Router();

/**
 * POST /api/analyze-url
 * Analyzes decoded text (likely URL) for malicious content
 * Uses ML model to classify and provides detailed report
 */
router.post('/analyze-url', apiRateLimiter, analyzeUrl);

export default router;
