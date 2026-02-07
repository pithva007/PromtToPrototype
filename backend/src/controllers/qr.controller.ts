import { Request, Response } from 'express';
import { decodeQRFromImage } from '../utils/qrDecoder';
import {
    ErrorCodes,
    isValidMimeType,
    isValidFileSize,
    isValidUrl,
} from '../utils/validators';
import { parseQRCode, QRType, validateUPI } from '../utils/uriParsers';
import { analyzeUrlWithML } from '../utils/urlAnalysis';

export interface QRDecodeResponse {
    success: boolean;
    decodedText: string | null;
    isUrl: boolean;
    normalizedUrl: string | null;
    // QR Type (NEW - for non-HTTP QR codes)
    qrType?: QRType;
    parsedData?: Record<string, any>;
    // UPI security validation (NEW)
    upiValidation?: {
        isSuspicious: boolean;
        riskLevel: 'safe' | 'warning' | 'danger';
        warnings: string[];
    };
    // URL parts (NEW)
    hostname?: string;
    tld?: string;
    // ML analysis fields (only present if URL detected)
    mlLabel?: 'benign' | 'malicious' | 'unknown';
    mlScore?: number;
    thresholdUsed?: number;
    // Risk band (NEW - centralized backend computation)
    riskBand?: 'safe' | 'suspicious' | 'dangerous';
    // Allowlist fields (NEW)
    allowlistApplied?: boolean;
    overridePolicy?: {
        safe_override_max: number;
        applied_domain?: string;
    };
    attackVector?: 'phishing' | 'malware' | 'payment-scam' | 'redirect' | 'unknown';
    reasons?: string[];
    error: {
        code: string;
        message: string;
    } | null;
}

export interface QRDecodeResponse {
    success: boolean;
    decodedText: string | null;
    isUrl: boolean;
    normalizedUrl: string | null;
    // QR Type (NEW - for non-HTTP QR codes)
    qrType?: QRType;
    parsedData?: Record<string, any>;
    // UPI security validation (NEW)
    upiValidation?: {
        isSuspicious: boolean;
        riskLevel: 'safe' | 'warning' | 'danger';
        warnings: string[];
    };
    // URL parts (NEW)
    hostname?: string;
    tld?: string;
    // ML analysis fields (only present if URL detected)
    mlLabel?: 'benign' | 'malicious' | 'unknown';
    mlScore?: number;
    thresholdUsed?: number;
    // Risk band (NEW - centralized backend computation)
    riskBand?: 'safe' | 'suspicious' | 'dangerous';
    // Allowlist fields (NEW)
    allowlistApplied?: boolean;
    overridePolicy?: {
        safe_override_max: number;
        applied_domain?: string;
    };
    attackVector?: 'phishing' | 'malware' | 'payment-scam' | 'redirect' | 'unknown';
    reasons?: string[];
    modelVersion?: string;
    error: {
        code: string;
        message: string;
    } | null;
}

/**
 * Controller for POST /api/qr/decode
 * Decodes QR code from uploaded image and automatically analyzes URLs with ML
 */
export async function decodeQRCode(
    req: Request,
    res: Response<QRDecodeResponse>
): Promise<void> {
    try {
        // Check if file exists
        if (!req.file) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.NO_FILE_UPLOADED,
                    message: 'No file uploaded',
                },
            });
            return;
        }

        const file = req.file;

        // Validate MIME type
        if (!isValidMimeType(file.mimetype)) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.INVALID_FILE_TYPE,
                    message: `Invalid file type. Allowed types: image/png, image/jpeg, image/webp`,
                },
            });
            return;
        }

        // Validate file size
        if (!isValidFileSize(file.size)) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.FILE_TOO_LARGE,
                    message: `File size exceeds maximum of 5MB`,
                },
            });
            return;
        }

        // Decode QR code
        const decodeResult = await decodeQRFromImage(file.buffer);

        if (!decodeResult.success || !decodeResult.decodedText) {
            res.status(200).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: decodeResult.error?.code || ErrorCodes.QR_NOT_FOUND,
                    message: decodeResult.error?.message || 'QR code not found in image',
                },
            });
            return;
        }

        // Check if decoded text is a URL
        const isUrl = isValidUrl(decodeResult.decodedText);
        const normalizedUrl = isUrl ? normalizeUrl(decodeResult.decodedText) : null;

        // Parse QR code to detect type (UPI, phone, email, etc.)
        const qrData = parseQRCode(decodeResult.decodedText);

        // If it's a non-HTTP QR code (UPI, phone, email, WiFi, etc.), return parsed data
        if (qrData.qrType !== 'http' && qrData.qrType !== 'text') {
            // For UPI codes, add security validation
            let upiValidation = null;
            if (qrData.qrType === 'upi' && qrData.parsedData) {
                upiValidation = validateUPI(qrData.parsedData as any);
            }

            res.status(200).json({
                success: true,
                decodedText: decodeResult.decodedText,
                isUrl: false,  // Not an HTTP URL
                normalizedUrl: null,
                qrType: qrData.qrType,
                parsedData: qrData.parsedData,
                // UPI-specific validation (NEW)
                upiValidation: upiValidation || undefined,
                error: null,
            });
            return;
        }

        // If it's a URL, automatically run ML analysis using shared function
        if (isUrl) {
            // Use shared analysis function - single source of truth
            const analysisResult = await analyzeUrlWithML(decodeResult.decodedText);

            // Set no-cache headers
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            // Return result (includes all ML analysis fields)
            res.status(200).json({
                ...analysisResult,
                success: true,
                decodedText: decodeResult.decodedText,
            });
        } else {
            // Not a URL, just return basic decode result
            res.status(200).json({
                success: true,
                decodedText: decodeResult.decodedText,
                isUrl: false,
                normalizedUrl: null,
                error: null,
            });
        }
    } catch (error) {
        console.error('Error in decodeQRCode controller:', error);
        res.status(500).json({
            success: false,
            decodedText: null,
            isUrl: false,
            normalizedUrl: null,
            error: {
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Internal server error',
            },
        });
    }
}
