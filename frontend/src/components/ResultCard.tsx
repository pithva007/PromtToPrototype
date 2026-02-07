'use client';

import { useState } from 'react';

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
    error?: {
        code: string;
        message: string;
    } | null;
}

type RiskLevel = 'safe' | 'suspicious' | 'danger';

function mapRiskBand(riskBand?: 'safe' | 'suspicious' | 'dangerous'): RiskLevel {
    if (!riskBand) return 'suspicious';
    if (riskBand === 'dangerous') return 'danger';
    return riskBand;
}

function getRiskColor(level: RiskLevel): string {
    switch (level) {
        case 'safe':
            return 'from-green-500 to-emerald-600';
        case 'suspicious':
            return 'from-yellow-500 to-orange-600';
        case 'danger':
            return 'from-red-500 to-rose-600';
    }
}

function getRiskBgColor(level: RiskLevel): string {
    switch (level) {
        case 'safe':
            return 'bg-green-50 dark:bg-green-900/20 border-green-500';
        case 'suspicious':
            return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500';
        case 'danger':
            return 'bg-red-50 dark:bg-red-900/20 border-red-500';
    }
}

function getRiskTextColor(level: RiskLevel): string {
    switch (level) {
        case 'safe':
            return 'text-green-800 dark:text-green-200';
        case 'suspicious':
            return 'text-yellow-800 dark:text-yellow-200';
        case 'danger':
            return 'text-red-800 dark:text-red-200';
    }
}

function getRiskIcon(level: RiskLevel): string {
    switch (level) {
        case 'safe':
            return '✓';
        case 'suspicious':
            return '⚠';
        case 'danger':
            return '✕';
    }
}

function getAttackVectorDisplay(vector: string): string {
    switch (vector) {
        case 'phishing':
            return '🎣 Phishing Attack';
        case 'malware':
            return '🦠 Malware Distribution';
        case 'payment-scam':
            return '💸 Payment Scam';
        case 'redirect':
            return '🔀 Suspicious Redirect';
        default:
            return '❓ Unknown';
    }
}

interface ResultCardProps {
    result: AnalysisResult;
}

export default function ResultCard({ result }: ResultCardProps) {
    const [showConfirmOpen, setShowConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const riskLevel = mapRiskBand(result.riskBand);

    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(result.decodedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleOpenLink = () => {
        if (result.normalizedUrl && riskLevel !== 'safe') {
            setShowConfirmOpen(true);
        } else if (result.normalizedUrl) {
            window.open(result.normalizedUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const confirmAndOpen = () => {
        if (result.normalizedUrl) {
            window.open(result.normalizedUrl, '_blank', 'noopener,noreferrer');
            setShowConfirmOpen(false);
        }
    };

    return (
        <div className={`${getRiskBgColor(riskLevel)} border-l-4 p-6 rounded-xl space-y-5 shadow-lg`}>
            {/* Risk Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 bg-gradient-to-br ${getRiskColor(riskLevel)} rounded-xl flex items-center justify-center shadow-md text-white text-2xl font-bold`}>
                            {getRiskIcon(riskLevel)}
                        </div>
                        <div>
                            <h3 className={`text-2xl font-bold ${getRiskTextColor(riskLevel)} capitalize`}>
                                {riskLevel === 'safe' ? 'Safe URL' : riskLevel === 'suspicious' ? 'Suspicious URL' : 'Dangerous URL'}
                            </h3>
                            <p className={`text-sm ${getRiskTextColor(riskLevel)} opacity-75`}>
                                {result.mlLabel === 'unknown' ? 'Unable to classify' : `Classified as ${result.mlLabel}`}
                            </p>
                        </div>
                    </div>

                    {/* Hostname Display */}
                    {result.hostname && (
                        <p className={`text-xs ${getRiskTextColor(riskLevel)} opacity-75 font-mono mt-1`}>
                            {result.hostname}
                        </p>
                    )}

                    {/* Allowlist Override Notice */}
                    {result.allowlistApplied && result.overridePolicy?.applied_domain && (
                        <div className="mt-3 flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700">
                            <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                Trusted domain override applied: {result.overridePolicy.applied_domain}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Risk Score Visualization */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className={`text-sm font-semibold ${getRiskTextColor(riskLevel)}`}>
                        Threat Score
                    </span>
                    <span className={`text-lg font-bold ${getRiskTextColor(riskLevel)}`}>
                        {(result.mlScore * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r ${getRiskColor(riskLevel)} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                        style={{ width: `${result.mlScore * 100}%` }}
                    />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Threshold: {(result.thresholdUsed * 100).toFixed(0)}% •
                    Confidence: {result.mlLabel !== 'unknown' ? `${((1 - Math.abs(result.mlScore - 0.5) * 2) * 100).toFixed(0)}%` : 'N/A'}
                </p>
            </div>

            {/* Attack Vector */}
            {result.attackVector !== 'unknown' && (
                <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-current/20">
                    <p className={`text-sm font-semibold ${getRiskTextColor(riskLevel)} mb-1`}>
                        Detected Threat Type:
                    </p>
                    <p className={`text-lg font-bold ${getRiskTextColor(riskLevel)}`}>
                        {getAttackVectorDisplay(result.attackVector)}
                    </p>
                </div>
            )}

            {/* Decoded URL */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">
                    Decoded URL:
                </p>
                <p className="text-slate-900 dark:text-white font-mono text-sm break-all bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                    {result.decodedText}
                </p>
            </div>

            {/* Reasons */}
            {result.reasons && result.reasons.length > 0 && (
                <div className="space-y-2">
                    <p className={`text-sm font-semibold ${getRiskTextColor(riskLevel)} flex items-center gap-2`}>
                        <span>📋</span>
                        Analysis Details:
                    </p>
                    <ul className="space-y-2">
                        {result.reasons.map((reason, idx) => (
                            <li
                                key={idx}
                                className={`flex items-start gap-2 text-sm ${getRiskTextColor(riskLevel)} bg-white/30 dark:bg-slate-800/30 p-3 rounded-lg`}
                            >
                                <span className="flex-shrink-0 mt-0.5">•</span>
                                <span className="flex-1">{reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Model Version */}
            {result.modelVersion && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Model: {result.modelVersion}
                </p>
            )}

            {/* Confirm Dialog */}
            {showConfirmOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                            ⚠️ Confirm Open Link
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                            This URL has been classified as <span className="font-bold">{riskLevel}</span>. 
                            Are you sure you want to open it in a new tab?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmAndOpen}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Open Anyway
                            </button>
                            <button
                                onClick={() => setShowConfirmOpen(false)}
                                className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
                {result.normalizedUrl && (
                    <button
                        onClick={handleOpenLink}
                        className={`flex-1 ${
                            riskLevel === 'safe'
                                ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-green-700 dark:text-green-300 border-2 border-green-500'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600'
                        } text-sm font-semibold py-3 px-4 rounded-xl transition-colors text-center`}
                    >
                        {riskLevel === 'safe' ? 'Open Link Safely →' : '⚠️ Open Link'}
                    </button>
                )}
                <button
                    onClick={handleCopyToClipboard}
                    className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 text-sm font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                    {copied ? '✓ Copied!' : '📋 Copy URL'}
                </button>
            </div>
        </div>
    );
}
