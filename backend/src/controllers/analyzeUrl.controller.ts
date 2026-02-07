import { Request, Response } from 'express';
import { predictUrl, MLError } from '../utils/mlClient';
import { isValidUrl, normalizeUrl } from '../utils/validators';

const ML_THRESHOLD = parseFloat(process.env.ML_THRESHOLD || '0.60');

export interface AnalyzeUrlResponse {
    success: boolean;
    decodedText: string;
    isUrl: boolean;
    normalizedUrl: string | null;
    mlLabel: 'benign' | 'malicious' | 'unknown';
    mlScore: number;
    thresholdUsed: number;
    attackVector: 'phishing' | 'malware' | 'payment-scam' | 'redirect' | 'unknown';
    reasons: string[];
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
    url: string
): string[] {
    const reasons: string[] = [];

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
                reasons.push('URL contains payment-related keywords often used in scams');
                break;
            case 'redirect':
                reasons.push('URL uses a shortener service that could hide malicious destinations');
                break;
        }

        // Additional URL characteristics
        const lowerUrl = url.toLowerCase();

        if (lowerUrl.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
            reasons.push('URL uses IP address instead of domain name');
        }

        const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work'];
        if (suspiciousTLDs.some(tld => lowerUrl.includes(tld))) {
            reasons.push('URL uses a high-risk top-level domain');
        }

        if (url.length > 75) {
            reasons.push('URL is unusually long, which can hide malicious intent');
        }

        const specialChars = (url.match(/[@%#]/g) || []).length;
        if (specialChars > 3) {
            reasons.push('URL contains excessive special characters');
        }
    } else if (mlLabel === 'benign') {
        reasons.push(`URL appears safe (${((1 - mlScore) * 100).toFixed(1)}% confidence)`);

        try {
            const urlObj = new URL(url);
            if (urlObj.protocol === 'https:') {
                reasons.push('Uses secure HTTPS protocol');
            }

            const wellKnownDomains = ['google', 'github', 'microsoft', 'amazon', 'apple', 'stackoverflow'];
            if (wellKnownDomains.some(domain => urlObj.hostname.includes(domain))) {
                reasons.push('Domain belongs to a well-known organization');
            }
        } catch {
            // Invalid URL format
        }
    } else {
        reasons.push('Unable to analyze URL with ML model');
    }

    return reasons;
}

/**
 * Controller for POST /api/analyze-url
 * Analyzes URL with ML model and returns comprehensive report
 */
export async function analyzeUrl(
    req: Request,
    res: Response<AnalyzeUrlResponse>
): Promise<void> {
    try {
        const { decodedText } = req.body;

        // Validate input
        if (!decodedText || typeof decodedText !== 'string') {
            res.status(400).json({
                success: false,
                decodedText: '',
                isUrl: false,
                normalizedUrl: null,
                mlLabel: 'unknown',
                mlScore: 0,
                thresholdUsed: ML_THRESHOLD,
                attackVector: 'unknown',
                reasons: [],
                error: {
                    code: 'INVALID_INPUT',
                    message: 'decodedText is required and must be a string',
                },
            });
            return;
        }

        // Check if text is a URL
        const isUrl = isValidUrl(decodedText);
        const normalizedUrl = isUrl ? normalizeUrl(decodedText) : null;

        // If not a URL, return early
        if (!isUrl || !normalizedUrl) {
            res.status(200).json({
                success: true,
                decodedText,
                isUrl: false,
                normalizedUrl: null,
                mlLabel: 'unknown',
                mlScore: 0,
                thresholdUsed: ML_THRESHOLD,
                attackVector: 'unknown',
                reasons: ['Not a valid URL'],
                error: null,
            });
            return;
        }

        // Call ML service for prediction
        let mlLabel: 'benign' | 'malicious' | 'unknown' = 'unknown';
        let mlScore = 0;

        try {
            const prediction = await predictUrl(normalizedUrl);
            mlLabel = prediction.label;
            mlScore = prediction.score;
        } catch (error) {
            const mlError = error as MLError;
            console.error('ML prediction error:', mlError);

            // Return with ML error but still provide basic analysis
            const attackVector = detectAttackVector(normalizedUrl);

            res.status(200).json({
                success: false,
                decodedText,
                isUrl: true,
                normalizedUrl,
                mlLabel: 'unknown',
                mlScore: 0,
                thresholdUsed: ML_THRESHOLD,
                attackVector: attackVector as any,
                reasons: ['ML service unavailable - manual review recommended'],
                error: {
                    code: mlError.code,
                    message: mlError.message,
                },
            });
            return;
        }

        // Detect attack vector
        const attackVector = detectAttackVector(normalizedUrl);

        // Generate human-readable reasons
        const reasons = generateReasons(mlLabel, mlScore, attackVector, normalizedUrl);

        // Return success response
        res.status(200).json({
            success: true,
            decodedText,
            isUrl: true,
            normalizedUrl,
            mlLabel,
            mlScore,
            thresholdUsed: ML_THRESHOLD,
            attackVector: attackVector as any,
            reasons,
            error: null,
        });
    } catch (error) {
        console.error('Error in analyzeUrl controller:', error);
        res.status(500).json({
            success: false,
            decodedText: '',
            isUrl: false,
            normalizedUrl: null,
            mlLabel: 'unknown',
            mlScore: 0,
            thresholdUsed: ML_THRESHOLD,
            attackVector: 'unknown',
            reasons: [],
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        });
    }
}
