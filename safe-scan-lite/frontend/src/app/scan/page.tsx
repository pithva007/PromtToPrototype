'use client';

import { useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

interface QRDecodeResponse {
    success: boolean;
    decodedText: string | null;
    isUrl: boolean;
    normalizedUrl: string | null;
    error: {
        code: string;
        message: string;
    } | null;
}

export default function ScanPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<QRDecodeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            setResult(null);
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);
    };

    const handleScan = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/qr/decode`, {
                method: 'POST',
                body: formData,
            });

            const data: QRDecodeResponse = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error?.message || 'Failed to decode QR code');
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
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary-900 dark:text-white mb-2">
                        Scan QR Code
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Upload an image containing a QR code to decode it safely
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
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

                        <label
                            htmlFor="file-upload"
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-xl cursor-pointer bg-primary-50 dark:bg-slate-700 hover:bg-primary-100 dark:hover:bg-slate-600 transition-colors"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                <svg
                                    className="w-12 h-12 mb-3 text-primary-500 dark:text-primary-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300 font-semibold">
                                    {file ? file.name : 'Click to upload QR image'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    PNG, JPG, or WebP (max 5MB)
                                </p>
                            </div>
                        </label>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleScan}
                                disabled={!file || loading}
                                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:transform-none disabled:shadow-md"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
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
                                        Decoding...
                                    </span>
                                ) : (
                                    'Scan QR Code'
                                )}
                            </button>

                            {file && (
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="px-6 py-4 border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
                            <div className="flex items-start">
                                <svg
                                    className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success Result */}
                    {result && result.success && (
                        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded-lg space-y-4">
                            <div className="flex items-start">
                                <svg
                                    className="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div className="flex-1 space-y-3">
                                    <p className="text-sm text-green-800 dark:text-green-200 font-semibold">
                                        QR Code Decoded Successfully!
                                    </p>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                                            Decoded Content:
                                        </p>
                                        <p className="text-slate-900 dark:text-white font-mono text-sm break-all">
                                            {result.decodedText}
                                        </p>
                                    </div>

                                    {result.isUrl && result.normalizedUrl && (
                                        <div className="flex gap-2">
                                            <a
                                                href={result.normalizedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors text-center"
                                            >
                                                Open Link →
                                            </a>
                                            <button
                                                onClick={() => handleCopyToClipboard(result.normalizedUrl!)}
                                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    )}

                                    {!result.isUrl && (
                                        <button
                                            onClick={() => handleCopyToClipboard(result.decodedText!)}
                                            className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                                        >
                                            Copy Text
                                        </button>
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
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition-colors"
                    >
                        ← Back to Home
                    </a>
                </div>
            </div>
        </main>
    );
}
