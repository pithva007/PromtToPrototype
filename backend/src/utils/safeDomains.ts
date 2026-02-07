/**
 * Safe Domains Allowlist Utility
 * Provides trusted domain matching for false-positive mitigation
 */

import { URL } from 'url';

// High-risk TLDs commonly used in phishing/malware
export const HIGH_RISK_TLDS = [
    'tk', 'ml', 'ga', 'cf', 'gq',  // Free TLDs from Freenom
    'xyz', 'top', 'click', 'zip', 'mov',  // Suspicious TLDs
    'loan', 'download', 'review', 'gdn', 'work'
];

/**
 * Get safe domains from environment or use defaults
 */
export function getSafeDomains(): string[] {
    const envDomains = process.env.SAFE_DOMAINS || '';

    const defaultDomains = [
        'instagram.com',
        'linkedin.com',
        'codeforces.com',
        'github.com',
        'google.com',
        'youtube.com',
        'facebook.com',
        'twitter.com',
        'amazon.com',
        'microsoft.com',
        'apple.com',
        'netflix.com',
        'stackoverflow.com',
        'reddit.com',
        'wikipedia.org',
        'paypal.com',
        'dropbox.com',
        'spotify.com',
        'adobe.com',
        'salesforce.com'
    ];

    if (envDomains) {
        return envDomains.split(',').map(d => d.trim()).filter(d => d.length > 0);
    }

    return defaultDomains;
}

/**
 * Extract hostname and TLD from URL
 */
export function extractUrlParts(urlString: string): { hostname: string; tld: string } | null {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname.toLowerCase();
        const parts = hostname.split('.');
        const tld = parts.length > 1 ? parts[parts.length - 1] : '';

        return { hostname, tld };
    } catch (error) {
        return null;
    }
}

/**
 * Check if hostname matches any safe domain
 * Uses endsWith matching to support subdomains
 * e.g., "jobs.linkedin.com" matches "linkedin.com"
 */
export function isSafeDomain(hostname: string, safeDomains: string[]): string | null {
    const lowerHostname = hostname.toLowerCase();

    for (const safeDomain of safeDomains) {
        const lowerSafeDomain = safeDomain.toLowerCase();

        // Exact match
        if (lowerHostname === lowerSafeDomain) {
            return safeDomain;
        }

        // Subdomain match (ends with .safeDomain)
        if (lowerHostname.endsWith('.' + lowerSafeDomain)) {
            return safeDomain;
        }
    }

    return null;
}

/**
 * Check if TLD is high-risk
 */
export function isHighRiskTld(tld: string): boolean {
    return HIGH_RISK_TLDS.includes(tld.toLowerCase());
}

/**
 * Compute risk band based on ML score, threshold, and allowlist override
 */
export interface RiskBandResult {
    riskBand: 'safe' | 'suspicious' | 'dangerous';
    allowlistApplied: boolean;
    matchedDomain: string | null;
}

export function computeRiskBand(
    mlScore: number,
    mlThreshold: number,
    hostname: string | null,
    safeDomains: string[],
    safeOverrideMax: number = 0.95
): RiskBandResult {
    let riskBand: 'safe' | 'suspicious' | 'dangerous';
    let allowlistApplied = false;
    let matchedDomain: string | null = null;

    // Check allowlist override
    if (hostname) {
        matchedDomain = isSafeDomain(hostname, safeDomains);

        if (matchedDomain && mlScore < safeOverrideMax) {
            allowlistApplied = true;
            // Downgrade risk for allowlisted domains
            riskBand = mlScore < 0.4 ? 'safe' : 'suspicious';
            return { riskBand, allowlistApplied, matchedDomain };
        }
    }

    // Standard risk band computation
    if (mlScore >= mlThreshold) {
        riskBand = 'dangerous';
    } else if (mlScore >= 0.4) {
        riskBand = 'suspicious';
    } else {
        riskBand = 'safe';
    }

    return { riskBand, allowlistApplied, matchedDomain };
}
