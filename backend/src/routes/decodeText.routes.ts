import express from 'express';
import { decodeText } from '../controllers/decodeText.controller';
import { apiRateLimiter } from '../middleware/rateLimiter.middleware';

const router = express.Router();

/**
 * POST /api/qr/decode-text
 * Decodes QR text (from camera scan) and analyzes/parses it
 * Returns same format as /api/qr/decode
 */
router.post('/qr/decode-text', apiRateLimiter, decodeText);

export default router;
