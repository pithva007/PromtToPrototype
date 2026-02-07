import { Request, Response } from 'express';
import { parseQRCode, validateUPI } from '../utils/uriParsers';
import { analyzeUrlWithML } from '../utils/urlAnalysis';
import { isValidUrl } from '../utils/validators';
import { QRDecodeResponse } from './qr.controller';

interface DecodeTextRequest {
    decodedText: string;
}

/**
 * Controller for POST /api/qr/decode-text
 * Handles decoded QR text (from camera scan) and returns same format as /api/qr/decode
 */
export async function decodeText(
    req: Request<{}, {}, DecodeTextRequest>,
    res: Response<QRDecodeResponse>
): Promise<void> {
    try {
        const { decodedText } = req.body;

        // Validate input
        if (!decodedText || typeof decodedText !== 'string') {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'decodedText is required and must be a string',
                },
            });
            return;
        }

        // Parse QR code to detect type (UPI, phone, email, WiFi, etc.)
        const qrData = parseQRCode(decodedText);

        // Check if it's a URL
        const isUrl = isValidUrl(decodedText);

        // If it's a non-HTTP QR code (UPI, phone, email, WiFi, etc.), return parsed data
        if (qrData.qrType !== 'http' && qrData.qrType !== 'text') {
            // For UPI codes, add security validation
            let upiValidation = null;
            if (qrData.qrType === 'upi' && qrData.parsedData) {
                upiValidation = validateUPI(qrData.parsedData as any);
            }

            res.status(200).json({
                success: true,
                decodedText: decodedText,
                isUrl: false,
                normalizedUrl: null,
                qrType: qrData.qrType,
                parsedData: qrData.parsedData,
                upiValidation: upiValidation || undefined,
                error: null,
            });
            return;
        }

        // If it's a URL, automatically run ML analysis
        if (isUrl) {
            const analysisResult = await analyzeUrlWithML(decodedText);

            // Set no-cache headers
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            // Return result (includes all ML analysis fields)
            res.status(200).json({
                ...analysisResult,
                success: true,
                decodedText: decodedText,
            });
        } else {
            // Not a URL, just return basic decode result
            res.status(200).json({
                success: true,
                decodedText: decodedText,
                isUrl: false,
                normalizedUrl: null,
                qrType: qrData.qrType,
                error: null,
            });
        }
    } catch (error) {
        console.error('Error in decodeText controller:', error);
        res.status(500).json({
            success: false,
            decodedText: null,
            isUrl: false,
            normalizedUrl: null,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        });
    }
}
