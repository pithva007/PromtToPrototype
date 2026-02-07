import express from 'express';
import { decodeQRCode } from '../controllers/qr.controller';
import { upload } from '../middleware/upload.middleware';
import { apiRateLimiter } from '../middleware/rateLimiter.middleware';

const router = express.Router();

/**
 * POST /api/qr/decode
 * Accepts multipart/form-data with field name "file"
 * Returns decoded QR code text/URL
 */
router.post(
    '/decode',
    apiRateLimiter,
    upload.single('file'),
    decodeQRCode
);

export default router;
