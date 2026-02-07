'use client';

import { useState, useRef, useEffect } from 'react';
import ResultCard, { AnalysisResult } from '@/components/ResultCard';
import CameraModal from '@/components/CameraModal';
import RiskBadge, { RiskBadgeSkeleton } from '@/components/RiskBadge';
import RiskMeter, { RiskMeterSkeleton } from '@/components/RiskMeter';
import HistoryPanel, { HistoryItem } from '@/components/HistoryPanel';
import { ToastContainer, useToast } from '@/components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const HISTORY_KEY = 'safescan_history';
const MAX_HISTORY_ITEMS = 10;

interface QRDecodeResponse {
    success: boolean;
    decodedText: string | null;
    isUrl: boolean;
    normalizedUrl: string | null;
    qrType?: 'http' | 'upi' | 'phone' | 'email' | 'sms' | 'wifi' | 'geo' | 'text';
    parsedData?: Record<string, any>;
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
type ExplanationMode = 'simple' | 'technical';

export default function ScanPage() {
    // Mode selection
    const [mode, setMode] = useState<ScanMode>('upload');
    const [explanationMode, setExplanationMode] = useState<ExplanationMode>('simple');

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

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Toast notifications
    const { toasts, showToast, removeToast } = useToast();

    // Load history from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse history:', e);
            }
        }
    }, []);

    // Save to history
    const saveToHistory = (result: QRDecodeResponse) => {
        if (!result.success || !result.decodedText) return;

        const item: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            riskLevel: result.riskBand || 'safe',
            url: result.normalizedUrl || undefined,
            qrType: result.qrType,
            decodedText: result.decodedText,
        };

        const updatedHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
        setHistory(updatedHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(HISTORY_KEY);
        showToast('History cleared', 'success');
    };

    const resetResults = () => {
        setDecodeResult(null);
        setAnalysisResult(null);
    };

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
            showToast(validationError, 'error');
            setFile(null);
            resetResults();
            return;
        }

        setFile(selectedFile);
        setError(null);
        resetResults();
    };

    const handleUploadScan = async () => {
        if (!file) {
            setError('Please select a file first');
            showToast('Please select a file first', 'error');
            return;
        }

        setLoading(true);
        setLoadingMessage('Scanning QR code...');
        setError(null);
        resetResults();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/api/qr/decode`, {
                method: 'POST',
                body: formData,
            });

            const data: QRDecodeResponse = await response.json();
            setDecodeResult(data);

            if (!data.success) {
                setError(data.error?.message || 'Failed to decode QR code');
                showToast(data.error?.message || 'Failed to decode QR code', 'error');
                return;
            }

            // Save to history
            saveToHistory(data);

            // If URL detected, set analysis result
            if (data.isUrl && data.decodedText) {
                setAnalysisResult(data as any);
            }

            showToast('QR code scanned successfully', 'success');

        } catch (err) {
            setError('Network error. Please check if the backend is running.');
            showToast('Network error. Please check if the backend is running.', 'error');
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handlePasteAnalyze = async () => {
        if (!urlInput.trim()) {
            setError('Please enter a URL');
            showToast('Please enter a URL', 'error');
            return;
        }

        setLoading(true);
        setLoadingMessage('Analyzing URL...');
        setError(null);
        resetResults();

        try {
            const response = await fetch(`${API_URL}/api/qr/decode-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ decodedText: urlInput.trim() }),
            });

            const data: QRDecodeResponse = await response.json();
            setDecodeResult(data);

            if (!data.success) {
                setError(data.error?.message || 'Failed to analyze URL');
                showToast(data.error?.message || 'Failed to analyze URL', 'error');
                return;
            }

            // Save to history
            saveToHistory(data);

            // If URL detected, set analysis result
            if (data.isUrl && data.decodedText) {
                setAnalysisResult(data as any);
            }

            showToast('URL analyzed successfully', 'success');

        } catch (err) {
            setError('Network error. Please check if the backend is running.');
            showToast('Network error. Please check if the backend is running.', 'error');
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleCameraQRDetected = async (decodedText: string) => {
        setLoading(true);
        setLoadingMessage('Processing QR code...');
        setError(null);
        resetResults();

        try {
            const response = await fetch(`${API_URL}/api/qr/decode-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ decodedText }),
            });

            const data: QRDecodeResponse = await response.json();
            setDecodeResult(data);

            if (!data.success) {
                setError(data.error?.message || 'Failed to process QR code');
                showToast(data.error?.message || 'Failed to process QR code', 'error');
                return;
            }

            // Save to history
            saveToHistory(data);

            // If URL detected, set analysis result
            if (data.isUrl && data.decodedText) {
                setAnalysisResult(data as any);
            }

            showToast('QR code scanned successfully', 'success');

        } catch (err) {
            setError('Network error. Please check if the backend is running.');
            showToast('Network error. Please check if the backend is running.', 'error');
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    // Action handlers
    const handleCopyUrl = () => {
        const textToCopy = decodeResult?.normalizedUrl || decodeResult?.decodedText;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            showToast('Copied to clipboard!', 'success');
        }
    };

    const handleOpenUrl = () => {
        const url = decodeResult?.normalizedUrl || decodeResult?.decodedText;
        if (url && decodeResult?.riskBand === 'safe') {
            window.open(url, '_blank');
            showToast('Opening URL...', 'info');
        } else if (url) {
            const confirmed = confirm('This URL may be risky. Are you sure you want to open it?');
            if (confirmed) {
                window.open(url, '_blank');
                showToast('Opening URL...', 'warning');
            }
        }
    };

    const handleReportQR = () => {
        showToast('Report functionality coming soon!', 'info');
    };

    const handleHistoryItemClick = () => {
        // Simulate re-scanning the historical item
        showToast('Loading from history...', 'info');
        // In a real implementation, you might want to re-fetch or store full results
    };

    // Get risk score for meter (0-100)
    const getRiskScore = (): number => {
        if (!decodeResult || !decodeResult.success) return 0;

        if (decodeResult.mlScore !== undefined) {
            return Math.round(decodeResult.mlScore * 100);
        }

        // Fallback based on riskBand
        if (decodeResult.riskBand === 'safe') return 20;
        if (decodeResult.riskBand === 'suspicious') return 60;
        if (decodeResult.riskBand === 'dangerous') return 90;

        return 0;
    };

    // Get confidence percentage
    const getConfidence = (): number => {
        if (!decodeResult || !decodeResult.mlScore) return 95; // Default high confidence
        return Math.round((1 - Math.abs(decodeResult.mlScore - 0.5) * 2) * 100);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Toast Container */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Camera Modal */}
            {showCameraModal && (
                <CameraModal
                    isOpen={showCameraModal}
                    onQRDetected={handleCameraQRDetected}
                    onClose={() => setShowCameraModal(false)}
                />
            )}

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Safe-Scan Lite
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Premium QR Code Security Scanner
                    </p>
                </header>

                {/* Mode Selection */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    <button
                        onClick={() => setMode('upload')}
                        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${mode === 'upload'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Upload
                    </button>
                    <button
                        onClick={() => setMode('paste')}
                        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${mode === 'paste'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Paste URL
                    </button>
                    <button
                        onClick={() => setMode('camera')}
                        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${mode === 'camera'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Camera Scan
                    </button>
                </div>

                {/* Upload/Camera UI Area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
                    {mode === 'upload' && (
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ALLOWED_TYPES.join(',')}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                            >

                                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                                    {file ? file.name : 'Click to select QR code image'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    PNG, JPG, WebP (max 5MB)
                                </p>
                            </div>
                            <button
                                onClick={handleUploadScan}
                                disabled={!file || loading}
                                className="w-full py-3 px-6 rounded-lg font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg"
                            >
                                {loading ? loadingMessage : 'Scan QR Code'}
                            </button>
                        </div>
                    )}

                    {mode === 'paste' && (
                        <div className="space-y-4">

                            <p className="text-gray-700 dark:text-gray-300 font-medium text-center mb-4">
                                Paste a URL to analyze its security
                            </p>
                            <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handlePasteAnalyze()}
                                placeholder="Enter URL here..."
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                            />
                            <button
                                onClick={handlePasteAnalyze}
                                disabled={!urlInput.trim() || loading}
                                className="w-full py-3 px-6 rounded-lg font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg"
                            >
                                {loading ? loadingMessage : 'Analyze URL'}
                            </button>
                        </div>
                    )}

                    {mode === 'camera' && (
                        <div className="text-center space-y-4">

                            <p className="text-gray-700 dark:text-gray-300 font-medium">
                                Use your device camera to scan QR codes in real-time
                            </p>
                            <button
                                onClick={() => setShowCameraModal(true)}
                                disabled={loading}
                                className="w-full py-3 px-6 rounded-lg font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg"
                            >
                                Open Camera
                            </button>
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && !loading && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
                        <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="space-y-6">
                        <RiskBadgeSkeleton />
                        <RiskMeterSkeleton />
                    </div>
                )}

                {/* Results Display */}
                {!loading && decodeResult && decodeResult.success && (
                    <div className="space-y-6">
                        {/* Risk Badge */}
                        <RiskBadge
                            riskLevel={decodeResult.riskBand || 'safe'}
                            confidence={getConfidence()}
                            allowlistApplied={decodeResult.allowlistApplied}
                        />

                        {/* Risk Meter */}
                        {decodeResult.isUrl && (
                            <RiskMeter
                                score={getRiskScore()}
                                threshold={decodeResult.thresholdUsed ? Math.round(decodeResult.thresholdUsed * 100) : 80}
                            />
                        )}

                        {/* Explanation Toggle */}
                        {decodeResult.reasons && decodeResult.reasons.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Analysis Details
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setExplanationMode('simple')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${explanationMode === 'simple'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            Simple
                                        </button>
                                        <button
                                            onClick={() => setExplanationMode('technical')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${explanationMode === 'technical'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            Technical
                                        </button>
                                    </div>
                                </div>

                                {explanationMode === 'simple' && (
                                    <ul className="space-y-2">
                                        {decodeResult.reasons.slice(0, 3).map((reason, index) => (
                                            <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                                <span className="text-blue-500 font-bold">•</span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {explanationMode === 'technical' && (
                                    <div className="space-y-3">
                                        <ResultCard result={analysisResult || (decodeResult as any)} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={handleCopyUrl}
                                className="flex-1 py-3 px-6 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shadow-lg"
                            >
                                Copy
                            </button>

                            {decodeResult.isUrl && decodeResult.riskBand === 'safe' && (
                                <button
                                    onClick={handleOpenUrl}
                                    className="flex-1 py-3 px-6 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg"
                                >
                                    Open URL
                                </button>
                            )}

                            {decodeResult.isUrl && decodeResult.riskBand === 'suspicious' && (
                                <button
                                    onClick={handleOpenUrl}
                                    className="flex-1 py-3 px-6 rounded-lg font-semibold bg-yellow-500 text-white hover:bg-yellow-600 transition-all shadow-lg"
                                >
                                    Open with Caution
                                </button>
                            )}

                            {decodeResult.isUrl && decodeResult.riskBand === 'dangerous' && (
                                <button
                                    onClick={handleReportQR}
                                    className="flex-1 py-3 px-6 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
                                >
                                    Report
                                </button>
                            )}
                        </div>

                        {/* Non-URL QR Code Result */}
                        {decodeResult && decodeResult.success && !decodeResult.isUrl && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-xl space-y-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                                        <span className="text-white text-xl">✓</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                            QR Code Decoded Successfully
                                        </h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            Type: {decodeResult.qrType?.toUpperCase() || 'TEXT'}
                                        </p>
                                    </div>
                                </div>

                                {decodeResult.parsedData && Object.keys(decodeResult.parsedData).length > 0 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        {Object.entries(decodeResult.parsedData).map(([key, value]) => (
                                            <div key={key} className="mb-2 last:mb-0">
                                                <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                    {key}:
                                                </span>
                                                <span className="ml-2 text-gray-700 dark:text-gray-300">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {decodeResult.upiValidation && decodeResult.upiValidation.warnings.length > 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                        <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                                            <span>⚠️</span>
                                            Security Warnings
                                        </h4>
                                        <ul className="space-y-1">
                                            {decodeResult.upiValidation.warnings.map((warning, index) => (
                                                <li key={index} className="text-sm text-yellow-800 dark:text-yellow-200">
                                                    • {warning}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* History Panel */}
                <div className="mt-8">
                    <HistoryPanel
                        items={history}
                        onItemClick={handleHistoryItemClick}
                        onClear={clearHistory}
                    />
                </div>
            </div>
        </div>
    );
}
