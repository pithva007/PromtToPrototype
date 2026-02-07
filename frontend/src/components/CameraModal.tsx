'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQRDetected: (decodedText: string) => void;
}

export default function CameraModal({ isOpen, onClose, onQRDetected }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [qrDetected, setQrDetected] = useState(false);
    const controlsRef = useRef<IScannerControls | null>(null);
    const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);

    useEffect(() => {
        if (!isOpen) {
            stopScanning();
            return;
        }

        startScanning();

        return () => {
            stopScanning();
        };
    }, [isOpen]);

    const startScanning = async () => {
        setError(null);
        setIsScanning(true);
        setQrDetected(false);

        try {
            // Check for camera permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            // Stop the test stream - @zxing will request it again
            stream.getTracks().forEach(track => track.stop());

            // Initialize QR code reader
            const codeReader = new BrowserQRCodeReader();
            codeReaderRef.current = codeReader;

            if (!videoRef.current) return;

            // Start continuous decode from video device
            const controls = await codeReader.decodeFromVideoDevice(
                undefined, // Use default camera
                videoRef.current,
                (result, error) => {
                    if (result) {
                        const decodedText = result.getText();
                        setQrDetected(true);
                        setIsScanning(false);
                        
                        // Stop scanning immediately
                        if (controlsRef.current) {
                            controlsRef.current.stop();
                        }
                        
                        // Callback with decoded text
                        onQRDetected(decodedText);
                        
                        // Close modal after a brief delay to show "QR Detected" message
                        setTimeout(() => {
                            onClose();
                        }, 1000);
                    }
                    
                    if (error && !(error.name === 'NotFoundException')) {
                        console.error('QR decode error:', error);
                    }
                }
            );

            controlsRef.current = controls;

        } catch (err: any) {
            console.error('Camera access error:', err);
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else if (err.name === 'NotReadableError') {
                setError('Camera is already in use by another application.');
            } else {
                setError('Failed to access camera. Please check permissions.');
            }
            
            setIsScanning(false);
        }
    };

    const stopScanning = () => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
            codeReaderRef.current = null;
        }
        
        setIsScanning(false);
        setQrDetected(false);
    };

    const handleClose = () => {
        stopScanning();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📷</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Scan QR Code</h2>
                                <p className="text-sm text-blue-100">
                                    {qrDetected ? 'QR Code Detected!' : 'Position QR code in front of camera'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                        >
                            <span className="text-2xl">✕</span>
                        </button>
                    </div>
                </div>

                {/* Camera Preview */}
                <div className="p-6 space-y-4">
                    {error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-5 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">!</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                                        {error}
                                    </p>
                                    <button
                                        onClick={() => {
                                            setError(null);
                                            startScanning();
                                        }}
                                        className="text-sm text-red-600 dark:text-red-400 font-semibold hover:underline"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                autoPlay
                                playsInline
                                muted
                            />
                            
                            {/* Scanning Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative w-64 h-64">
                                    {/* Corner Brackets */}
                                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500" />
                                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500" />
                                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500" />
                                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500" />
                                    
                                    {/* Scanning Line */}
                                    {isScanning && !qrDetected && (
                                        <div className="absolute inset-x-0 h-1 bg-blue-500 shadow-lg shadow-blue-500/50 animate-scan" />
                                    )}
                                    
                                    {/* Success Checkmark */}
                                    {qrDetected && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 animate-scale-in">
                                                <span className="text-white text-4xl font-bold">✓</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {isScanning && !qrDetected && (
                                        <>
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-white text-sm font-semibold">Scanning...</span>
                                        </>
                                    )}
                                    {qrDetected && (
                                        <>
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                            <span className="text-white text-sm font-semibold">QR Detected!</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    {!error && !qrDetected && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                                👆 Position the QR code within the frame above
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {isScanning && !qrDetected && (
                            <button
                                onClick={stopScanning}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                            >
                                Stop Scanning
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0%, 100% { top: 0; }
                    50% { top: calc(100% - 4px); }
                }
                
                @keyframes scale-in {
                    0% { transform: scale(0); }
                    100% { transform: scale(1); }
                }
                
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
                
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
