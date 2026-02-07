'use client';

import { useState, useRef } from 'react';
import ResultCard, { AnalysisResult } from '@/components/ResultCard';
import CameraModal from '@/components/CameraModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

interface QRDecodeResponse {
    success: boolean;
    decodedText: string | null;
    isUrl: boolean;
    normalizedUrl: string | null;
    // Non-HTTP QR codes (NEW)
    qrType?: 'http' | 'upi' | 'phone' | 'email' | 'sms' | 'wifi' | 'geo' | 'text';
    parsedData?: Record<string, any>;
    // UPI security validation (NEW)
    upiValidation?: {
        isSuspicious: boolean;
        riskLevel: 'safe' | 'warning' | 'danger';
        warnings: string[];
    };
    hostname?: string;
    tld?: string;
    mlLabel?: 'benign' | 'malicious' | 'unknown';
    mlScore?: number;
    thresholdUsed?: number;
    riskBand?: 'safe' | 'suspicious' | 'dangerous';
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

type ScanMode = 'upload' | 'paste' | 'camera';

export default function ScanPage() {
    // Mode selection
    const [mode, setMode] = useState<ScanMode>('upload');
    
    // Upload mode state
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Paste mode state
    const [urlInput, setUrlInput] = useState('');
    
    // Camera mode state
    const [showCameraModal, setShowCameraModal] = useState(false);
    
    // Shared state
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [decodeResult, setDecodeResult] = useState<QRDecodeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const validateFile = (selectedFile: File): string | null => {
        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            return 'Invalid file type. Please upload PNG, JPG, or WebP images.';
        }
        if (selectedFile.size > MAX_FILE_SIZE) {
            return 'File size exceeds 5MB limit.';
        }
        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            setFile(null);
            resetResults();
            return;
        }

        setFile(selectedFile);
        setError(null);
        resetResults();
    };

    const handleScan = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setLoading(true);
        setError(null);
        setDecodeResult(null);
        setAnalysisResult(null);

        try {
            // Step 1: Decode QR code
            const formData = new FormData();
            formData.append('file', file);

            const decodeResponse = await fetch(`${API_URL}/api/qr/decode`, {
                method: 'POST',
                body: formData,
            });

            const decodeData: QRDecodeResponse = await decodeResponse.json();
            setDecodeResult(decodeData);

            if (!decodeData.success) {
                setError(decodeData.error?.message || 'Failed to decode QR code');
                return;
            }

            // Step 2: If URL detected, the ML analysis is already included in decodeData
            if (decodeData.isUrl && decodeData.decodedText) {
                // The /api/qr/decode endpoint now returns comprehensive ML analysis
                // including allowlist override, so we don't need a separate call
                setAnalysisResult(decodeData as any);  // decodeData has all ML fields
            }

        } catch (err) {
            setError('Network error. Please check if the backend is running.');
            console.error('Scan error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleReset = () => {
        setFile(null);
        setDecodeResult(null);
        setAnalysisResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const riskLevel = analysisResult
        ? mapRiskBand(analysisResult.riskBand)
        : undefined;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🔍</span>
                        </div>
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                            Safe-Scan
                        </h1>
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                        Upload QR codes and get instant AI-powered malicious URL detection with comprehensive threat analysis
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 border border-slate-200 dark:border-slate-700">
                    {/* Upload Section */}
                    <div className="space-y-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />


                        {!file ? (
                            <label
                                htmlFor="file-upload"
                                className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg cursor-pointer bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-700/50 dark:to-indigo-900/30 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-blue-100/50 dark:hover:bg-slate-600/50 transition-all duration-200 group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            Choose QR Code Image
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            PNG, JPG, WebP • Max 5MB
                                        </p>
                                    </div>
                                </div>
                            </label>
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <span className="text-white text-base">✓</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                                        File Selected
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400 truncate">
                                        {file.name}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleScan}
                                disabled={!file || loading}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl disabled:transform-none disabled:shadow-md flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        {analyzingUrl ? 'Analyzing URL...' : 'Decoding QR...'}
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xl">🔍</span>
                                        Scan QR Code
                                    </>
                                )}
                            </button>

                            {file && (
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="px-6 py-4 border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all disabled:opacity-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-5 rounded-xl shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">!</span>
                                </div>
                                <p className="text-sm text-red-800 dark:text-red-200 font-medium flex-1">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ML Analysis Result */}
                    {analysisResult && analysisResult.success && riskLevel && (
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
                                                {analysisResult.mlLabel === 'unknown' ? 'Unable to classify' : `Classified as ${analysisResult.mlLabel}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Hostname Display */}
                                    {analysisResult.hostname && (
                                        <p className={`text-xs ${getRiskTextColor(riskLevel)} opacity-75 font-mono mt-1`}>
                                            {analysisResult.hostname}
                                        </p>
                                    )}

                                    {/* Allowlist Override Notice */}
                                    {analysisResult.allowlistApplied && analysisResult.overridePolicy?.applied_domain && (
                                        <div className="mt-3 flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700">
                                            <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                                Trusted domain override applied: {analysisResult.overridePolicy.applied_domain}
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
                                        {(analysisResult.mlScore * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full bg-gradient-to-r ${getRiskColor(riskLevel)} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                                        style={{ width: `${analysisResult.mlScore * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Threshold: {(analysisResult.thresholdUsed * 100).toFixed(0)}% •
                                    Confidence: {analysisResult.mlLabel !== 'unknown' ? `${((1 - Math.abs(analysisResult.mlScore - 0.5) * 2) * 100).toFixed(0)}%` : 'N/A'}
                                </p>
                            </div>

                            {/* Attack Vector */}
                            {analysisResult.attackVector !== 'unknown' && (
                                <div className={`bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-current/20`}>
                                    <p className={`text-sm font-semibold ${getRiskTextColor(riskLevel)} mb-1`}>
                                        Detected Threat Type:
                                    </p>
                                    <p className={`text-lg font-bold ${getRiskTextColor(riskLevel)}`}>
                                        {getAttackVectorDisplay(analysisResult.attackVector)}
                                    </p>
                                </div>
                            )}

                            {/* Decoded URL */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">
                                    Decoded URL:
                                </p>
                                <p className="text-slate-900 dark:text-white font-mono text-sm break-all bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                                    {analysisResult.decodedText}
                                </p>
                            </div>

                            {/* Reasons */}
                            {analysisResult.reasons && analysisResult.reasons.length > 0 && (
                                <div className="space-y-2">
                                    <p className={`text-sm font-semibold ${getRiskTextColor(riskLevel)} flex items-center gap-2`}>
                                        <span>📋</span>
                                        Analysis Details:
                                    </p>
                                    <ul className="space-y-2">
                                        {analysisResult.reasons.map((reason, idx) => (
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

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                {analysisResult.normalizedUrl && riskLevel === 'safe' && (
                                    <a
                                        href={analysisResult.normalizedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-green-700 dark:text-green-300 border-2 border-green-500 text-sm font-semibold py-3 px-4 rounded-xl transition-colors text-center"
                                    >
                                        Open Link Safely →
                                    </a>
                                )}
                                <button
                                    onClick={() => handleCopyToClipboard(analysisResult.decodedText)}
                                    className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 text-sm font-semibold py-3 px-4 rounded-xl transition-colors"
                                >
                                    📋 Copy URL
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Simple Success (Non-URL) */}
                    {decodeResult && decodeResult.success && !decodeResult.isUrl && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-xl space-y-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                                    <span className="text-white text-xl">✓</span>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                                        QR Code Decoded Successfully!
                                    </p>

                                    {/* UPI Payment Display */}
                                    {decodeResult.qrType === 'upi' && decodeResult.parsedData && (
                                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-5 rounded-lg border-2 border-purple-300 dark:border-purple-700 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-3xl">💳</span>
                                                <div>
                                                    <p className="text-sm font-bold text-purple-900 dark:text-purple-200">
                                                        UPI Payment QR Code
                                                    </p>
                                                    {decodeResult.parsedData.detectedApp && (
                                                        <p className="text-xs text-purple-600 dark:text-purple-400">
                                                            {decodeResult.parsedData.detectedApp} QR
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Security Warning Banner */}
                                            {decodeResult.upiValidation && decodeResult.upiValidation.isSuspicious && (
                                                <div className={`p-4 rounded-lg border-2 ${decodeResult.upiValidation.riskLevel === 'danger'
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                                                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                                                    }`}>
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-2xl">
                                                            {decodeResult.upiValidation.riskLevel === 'danger' ? '🚨' : '⚠️'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-bold mb-2 ${decodeResult.upiValidation.riskLevel === 'danger'
                                                                    ? 'text-red-900 dark:text-red-200'
                                                                    : 'text-yellow-900 dark:text-yellow-200'
                                                                }`}>
                                                                {decodeResult.upiValidation.riskLevel === 'danger'
                                                                    ? '⚠️ Security Alert - Potential Scam Detected!'
                                                                    : '⚠️ Please Verify Before Proceeding'
                                                                }
                                                            </p>
                                                            <ul className={`text-xs space-y-1 ${decodeResult.upiValidation.riskLevel === 'danger'
                                                                    ? 'text-red-800 dark:text-red-300'
                                                                    : 'text-yellow-800 dark:text-yellow-300'
                                                                }`}>
                                                                {decodeResult.upiValidation.warnings.map((warning, idx) => (
                                                                    <li key={idx} className="flex items-start gap-1">
                                                                        <span>•</span>
                                                                        <span>{warning}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {decodeResult.parsedData.payeeName && (
                                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                            Beneficiary
                                                        </p>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                                                            {decodeResult.parsedData.payeeName}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                        UPI ID
                                                    </p>
                                                    <p className="text-sm font-mono text-slate-900 dark:text-white mt-1 break-all">
                                                        {decodeResult.parsedData.payeeAddress}
                                                    </p>
                                                </div>

                                                {decodeResult.parsedData.amount && (
                                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                            Amount
                                                        </p>
                                                        <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                                                            ₹{decodeResult.parsedData.amount}
                                                        </p>
                                                    </div>
                                                )}

                                                {decodeResult.parsedData.transactionNote && (
                                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                            Note
                                                        </p>
                                                        <p className="text-sm text-slate-900 dark:text-white mt-1">
                                                            {decodeResult.parsedData.transactionNote}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                                                ℹ️ Scan this with your UPI app to make payment
                                            </p>
                                        </div>
                                    )}

                                    {/* Plain text or unrecognized QR type */}
                                    {(!decodeResult.qrType || decodeResult.qrType === 'text') && (
                                        <>
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                                                    Decoded Content:
                                                </p>
                                                <p className="text-slate-900 dark:text-white font-mono text-sm break-all">
                                                    {decodeResult.decodedText}
                                                </p>
                                            </div>

                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                                ℹ This appears to be plain text, not a URL.
                                            </p>

                                            <button
                                                onClick={() => handleCopyToClipboard(decodeResult.decodedText!)}
                                                className="w-full bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                                            >
                                                Copy Text
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Back Link */}
                <div className="text-center mt-8">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
                    >
                        <span>←</span>
                        Back to Home
                    </a>
                </div>
            </div>
        </main>
    );
}
