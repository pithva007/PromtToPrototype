import { predictUrl, MLError } from './mlClient';
import { isValidUrl, normalizeUrl } from './validators';
import {
    getSafeDomains,
    extractUrlParts,
    computeRiskBand,
    isHighRiskTld,
} from './safeDomains';

const ML_THRESHOLD = parseFloat(process.env.ML_THRESHOLD || '0.80');
const SAFE_OVERRIDE_MAX = parseFloat(process.env.SAFE_OVERRIDE_MAX || '0.99');

export interface AnalysisResult {
    success: boolean;
    decodedText: string;
    isUrl: boolean;
    normalizedUrl: string | null;
    hostname?: string;
    tld?: string;
    mlLabel: 'benign' | 'malicious' | 'unknown';
    mlScore: number;
    thresholdUsed: number;
    riskBand?: 'safe' | 'suspicious' | 'dangerous';
    allowlistApplied?: boolean;
    overridePolicy?: {
        safe_override_max: number;
        applied_domain?: string;
    };
    attackVector: 'phishing' | 'malware' | 'payment-scam' | 'redirect' | 'unknown';
    reasons: string[];
    modelVersion?: string;
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
    allowlistApplied?: boolean,
    matchedDomain?: string,
    tld?: string | null
): string[] {
    const reasons: string[] = [];

    // Allowlist override takes priority
    if (allowlistApplied && matchedDomain) {
        reasons.push(`Trusted domain: ${matchedDomain} is in the safe allowlist`);
        reasons.push('This site has been verified as safe by our security team');
        return reasons;
    }

    if (mlLabel === 'malicious') {
        reasons.push(`ML model detected suspicious patterns (${(mlScore * 100).toFixed(1)}% malicious confidence)`);

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

        if (tld && isHighRiskTld(tld)) {
            reasons.push(`High-risk top-level domain (${tld})`);
        }

        if (url.length > 75) {
            reasons.push('URL is unusually long, which can hide malicious intent');
        }

        const specialChars = (url.match(/[@%#]/g) || []).length;
        if (specialChars > 3) {
            reasons.push('URL contains excessive special characters');
        }
    } else if (mlLabel === 'benign') {
        reasons.push(`URL appears safe (${((1 - mlScore) * 100).toFixed(1)}% benign confidence)`);

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
        reasons.push('ML service unavailable - manual review recommended');
        reasons.push('Exercise caution and verify the URL source before visiting');
    }

    return reasons;
}

/**
 * Single source of truth for URL analysis
 * Used by all three input modes: upload QR, paste URL, camera scan
 */
export async function analyzeUrlWithML(decodedText: string): Promise<AnalysisResult> {
    // Validate input
    if (!decodedText || typeof decodedText !== 'string') {
        return {
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
        };
    }

    // Check if text is a URL
    const isUrl = isValidUrl(decodedText);
    const normalizedUrl = isUrl ? normalizeUrl(decodedText) : null;

    // If not a URL, return early
    if (!isUrl || !normalizedUrl) {
        return {
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
        };
    }

    // Extract URL parts
    const urlParts = extractUrlParts(normalizedUrl);
    const hostname = urlParts?.hostname || undefined;
    const tld = urlParts?.tld || undefined;

    // Get safe domains
    const safeDomains = getSafeDomains();

    let mlLabel: 'benign' | 'malicious' | 'unknown' = 'unknown';
    let mlScore = 0;
    let mlError: MLError | null = null;

    // Call ML service for prediction
    try {
        const prediction = await predictUrl(normalizedUrl);
        mlLabel = prediction.label;
        mlScore = prediction.score;
        console.log(`[URL Analysis] ML prediction: ${mlLabel} (${(mlScore * 100).toFixed(1)}%)`);
    } catch (error) {
        mlError = error as MLError;
        console.error('[URL Analysis] ML prediction error:', mlError);
        // Continue with analysis even if ML fails
    }

    // Detect attack vector
    const attackVector = detectAttackVector(normalizedUrl);

    // Compute risk band with allowlist override
    const riskBandResult = computeRiskBand(
        mlScore,
        ML_THRESHOLD,
        hostname || null,
        safeDomains,
        SAFE_OVERRIDE_MAX
    );

    // Generate reasons (including allowlist info)
    const reasons = generateReasons(
        mlLabel,
        mlScore,
        attackVector,
        normalizedUrl,
        riskBandResult.allowlistApplied,
        riskBandResult.matchedDomain || undefined,
        tld
    );

    // Log for debugging
    console.log(`[URL Analysis] Result: riskBand=${riskBandResult.riskBand}, allowlist=${riskBandResult.allowlistApplied}, threshold=${ML_THRESHOLD}`);

    // Return complete analysis
    return {
        success: true,
        decodedText,
        isUrl: true,
        normalizedUrl,
        hostname,
        tld,
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
        modelVersion: 'RandomForest-v1.0',
        error: mlError ? {
            code: mlError.code || 'ML_UNAVAILABLE',
            message: mlError.message || 'ML service temporarily unavailable',
        } : null,
    };
}
