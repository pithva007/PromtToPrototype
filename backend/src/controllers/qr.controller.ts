import { Request, Response } from 'express';
import { decodeQRFromImage } from '../utils/qrDecoder';
import {
    ErrorCodes,
    isValidMimeType,
    isValidFileSize,
    isValidUrl,
    normalizeUrl,
} from '../utils/validators';
import { predictUrl, MLError } from '../utils/mlClient';
import {
    getSafeDomains,
    extractUrlParts,
    computeRiskBand,
    isHighRiskTld,
} from '../utils/safeDomains';
import { parseQRCode, QRType, validateUPI } from '../utils/uriParsers';

const ML_THRESHOLD = parseFloat(process.env.ML_THRESHOLD || '0.80');  // Increased from 0.60
const SAFE_OVERRIDE_MAX = parseFloat(process.env.SAFE_OVERRIDE_MAX || '0.99');

// Debug: Log actual values in controller
console.log(`[QR Controller] ML_THRESHOLD loaded: ${ML_THRESHOLD}`);
console.log(`[QR Controller] SAFE_OVERRIDE_MAX loaded: ${SAFE_OVERRIDE_MAX}`);

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

/**
 * Detect attack vector based on URL characteristics
 */
function detectAttackVector(url: string): string {
    const lowerUrl = url.toLowerCase();

    // Phishing patterns
    const phishingKeywords = ['login', 'verify', 'password', 'otp', 'signin', 'account', 'secure', 'confirm'];
    if (phishingKeywords.some(keyword => lowerUrl.includes(keyword))) {
        return 'phishing';
    }

    // Malware patterns
    const malwareExtensions = ['.apk', '.exe', '.zip', '.rar', '.msi', '.dmg', '.deb'];
    const malwareKeywords = ['download', 'installer', 'setup', 'crack', 'keygen'];
    if (
        malwareExtensions.some(ext => lowerUrl.endsWith(ext)) ||
        malwareKeywords.some(keyword => lowerUrl.includes(keyword))
    ) {
        return 'malware';
    }

    // Payment scam patterns
    const paymentKeywords = ['upi', 'pay', 'collect', 'invoice', 'payment', 'transaction', 'refund'];
    if (paymentKeywords.some(keyword => lowerUrl.includes(keyword))) {
        return 'payment-scam';
    }

    // URL shortener / redirect patterns
    const shortenerDomains = [
        'bit.ly',
        'tinyurl.com',
        'goo.gl',
        't.co',
        'ow.ly',
        'short.link',
        'tiny.cc',
        'rb.gy',
        'cutt.ly',
    ];

    if (shortenerDomains.some(domain => lowerUrl.includes(domain))) {
        return 'redirect';
    }

    return 'unknown';
}

/**
 * Generate human-readable reasons for the classification
 */
function generateReasons(
    mlLabel: string,
    mlScore: number,
    attackVector: string,
    url: string,
    allowlistApplied: boolean,
    matchedDomain: string | null,
    tld: string | null
): string[] {
    const reasons: string[] = [];

    // Allowlist override reason
    if (allowlistApplied && matchedDomain) {
        reasons.push(`Known trusted domain detected: ${matchedDomain}`);
    }

    if (mlLabel === 'malicious') {
        reasons.push(`ML model detected suspicious patterns (${(mlScore * 100).toFixed(1)}% confidence)`);

        switch (attackVector) {
            case 'phishing':
                reasons.push('URL contains login/verification keywords commonly used in phishing attacks');
                break;
            case 'malware':
                reasons.push('URL points to executable files or download pages');
                break;
            case 'payment-scam':
                reasons.push('URL contains payment/transaction keywords commonly used in scams');
                break;
            case 'redirect':
                reasons.push('URL uses a link shortener which may hide the final destination');
                break;
        }

        // High-risk TLD check
        if (tld && isHighRiskTld(tld)) {
            reasons.push(`URL uses a high-risk top-level domain (.${tld})`);
        }

        // Check for IP address
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
            reasons.push('URL uses raw IP address instead of domain name');
        }

        // Check for excessive special characters
        const specialCharsCount = (url.match(/[-_@~]/g) || []).length;
        if (specialCharsCount > 5) {
            reasons.push('URL contains excessive special characters');
        }

    } else if (mlLabel === 'benign') {
        reasons.push(`URL appears safe (${(100 - mlScore * 100).toFixed(1)}% confidence)`);

        // Add positive indicators
        if (url.startsWith('https://')) {
            reasons.push('Uses secure HTTPS protocol');
        }

        // Check for well-known domains
        const urlLower = url.toLowerCase();
        const knownGood = ['google', 'youtube', 'facebook', 'instagram', 'linkedin', 'github', 'microsoft', 'apple'];
        for (const brand of knownGood) {
            if (urlLower.includes(brand)) {
                reasons.push(`Domain belongs to a well-known organization`);
                break;
            }
        }
    } else {
        reasons.push('Unable to analyze URL with ML model');
    }

    return reasons;
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

        // If it's a URL, automatically run ML analysis
        if (isUrl && normalizedUrl) {
            let mlLabel: 'benign' | 'malicious' | 'unknown' = 'unknown';
            let mlScore = 0;
            let attackVector: string = 'unknown';
            let reasons: string[] = [];

            // Extract URL parts
            const urlParts = extractUrlParts(normalizedUrl);
            const hostname = urlParts?.hostname || null;
            const tld = urlParts?.tld || null;

            // Get safe domains
            const safeDomains = getSafeDomains();

            try {
                // Call ML service for prediction
                const prediction = await predictUrl(normalizedUrl);
                mlLabel = prediction.label;
                mlScore = prediction.score;

                // Detect attack vector
                attackVector = detectAttackVector(normalizedUrl);

                // Compute risk band with allowlist override
                const riskBandResult = computeRiskBand(
                    mlScore,
                    ML_THRESHOLD,
                    hostname,
                    safeDomains,
                    SAFE_OVERRIDE_MAX
                );

                // Generate reasons (including allowlist info)
                reasons = generateReasons(
                    mlLabel,
                    mlScore,
                    attackVector,
                    normalizedUrl,
                    riskBandResult.allowlistApplied,
                    riskBandResult.matchedDomain,
                    tld
                );

                // Debug: Log what we're sending to frontend
                console.log(`[QR Response] Sending: riskBand=${riskBandResult.riskBand}, threshold=${ML_THRESHOLD}, allowlist=${riskBandResult.allowlistApplied}`);

                // Prevent caching - force fresh data
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                res.set('Pragma', 'no-cache');
                res.set('Expires', '0');

                // Return success with ML analysis
                res.status(200).json({
                    success: true,
                    decodedText: decodeResult.decodedText,
                    isUrl: true,
                    normalizedUrl,
                    hostname: hostname || undefined,
                    tld: tld || undefined,
                    mlLabel,
                    mlScore,
                    thresholdUsed: ML_THRESHOLD,
                    riskBand: riskBandResult.riskBand,
                    allowlistApplied: riskBandResult.allowlistApplied,
                    overridePolicy: {
                        safe_override_max: SAFE_OVERRIDE_MAX,
                        applied_domain: riskBandResult.matchedDomain || undefined,
                    },
                    attackVector: attackVector as any,
                    reasons,
                    error: null,
                });
            } catch (error) {
                const mlError = error as MLError;
                console.error('ML prediction error:', mlError);

                // Return with ML unavailable, but still include basic analysis
                attackVector = detectAttackVector(normalizedUrl);

                // Compute risk band without ML (defaults to safe)
                const riskBandResult = computeRiskBand(
                    0,  // No ML score
                    ML_THRESHOLD,
                    hostname,
                    safeDomains,
                    SAFE_OVERRIDE_MAX
                );

                res.status(200).json({
                    success: true,
                    decodedText: decodeResult.decodedText,
                    isUrl: true,
                    normalizedUrl,
                    hostname: hostname || undefined,
                    tld: tld || undefined,
                    mlLabel: 'unknown',
                    mlScore: 0,
                    thresholdUsed: ML_THRESHOLD,
                    riskBand: riskBandResult.riskBand,
                    allowlistApplied: riskBandResult.allowlistApplied,
                    overridePolicy: {
                        safe_override_max: SAFE_OVERRIDE_MAX,
                        applied_domain: riskBandResult.matchedDomain || undefined,
                    },
                    attackVector: attackVector as any,
                    reasons: ['ML service unavailable - manual review recommended'],
                    error: {
                        code: mlError.code || 'ML_ERROR',
                        message: mlError.message || 'ML service error',
                    },
                });
            }
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
