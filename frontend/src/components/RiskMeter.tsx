import React, { useEffect, useState } from 'react';

interface RiskMeterProps {
    score: number; // 0-100
    threshold?: number; // Default 80
    className?: string;
}

export default function RiskMeter({ score, threshold = 80, className = '' }: RiskMeterProps) {
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        // Animate score on mount/change
        const timer = setTimeout(() => {
            setAnimatedScore(score);
        }, 100);
        return () => clearTimeout(timer);
    }, [score]);

    const getColor = () => {
        if (score < 50) return 'from-green-500 to-green-600';
        if (score < threshold) return 'from-yellow-500 to-yellow-600';
        return 'from-red-500 to-red-600';
    };

    const getRingColor = () => {
        if (score < 50) return 'ring-green-400/50';
        if (score < threshold) return 'ring-yellow-400/50';
        return 'ring-red-400/50';
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ring-2 ${getRingColor()} ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Risk Score
                </h3>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(animatedScore)}<span className="text-sm text-gray-500">/100</span>
                </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                {/* Animated fill */}
                <div
                    className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-1000 ease-out rounded-full`}
                    style={{ width: `${animatedScore}%` }}
                />

                {/* Threshold marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white"
                    style={{ left: `${threshold}%` }}
                >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        ↓ {threshold}
                    </div>
                </div>

                {/* Score indicator */}
                {animatedScore > 0 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-10 bg-white shadow-lg transition-all duration-1000 ease-out"
                        style={{ left: `${animatedScore}%` }}
                    />
                )}
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Safe</span>
                <span>Suspicious</span>
                <span>Dangerous</span>
            </div>

            {/* Status text */}
            <div className="mt-4 text-center">
                {score < 50 && (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Low risk detected
                    </p>
                )}
                {score >= 50 && score < threshold && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                        ⚠ Moderate risk detected
                    </p>
                )}
                {score >= threshold && (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        ✕ High risk detected
                    </p>
                )}
            </div>
        </div>
    );
}

// Skeleton loader for RiskMeter
export function RiskMeterSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="w-24 h-6 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="w-16 h-8 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex justify-between mt-3">
                <div className="w-8 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="w-12 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
        </div>
    );
}
