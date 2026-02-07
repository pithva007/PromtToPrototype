import React from 'react';

export type RiskLevel = 'safe' | 'suspicious' | 'dangerous';

interface RiskBadgeProps {
    riskLevel: RiskLevel;
    confidence?: number;
    allowlistApplied?: boolean;
    className?: string;
}

export default function RiskBadge({ riskLevel, confidence, allowlistApplied, className = '' }: RiskBadgeProps) {
    const configs = {
        safe: {
            label: 'Safe',
            icon: '✓',
            bgColor: 'bg-green-500 dark:bg-green-600',
            textColor: 'text-white',
            ringColor: 'ring-green-400 dark:ring-green-500',
            glowColor: 'shadow-green-500/50',
        },
        suspicious: {
            label: 'Suspicious',
            icon: '⚠',
            bgColor: 'bg-yellow-500 dark:bg-yellow-600',
            textColor: 'text-white',
            ringColor: 'ring-yellow-400 dark:ring-yellow-500',
            glowColor: 'shadow-yellow-500/50',
        },
        dangerous: {
            label: 'Dangerous',
            icon: '✕',
            bgColor: 'bg-red-500 dark:bg-red-600',
            textColor: 'text-white',
            ringColor: 'ring-red-400 dark:ring-red-500',
            glowColor: 'shadow-red-500/50',
        },
    };

    const config = configs[riskLevel];

    return (
        <div className={`relative ${className}`}>
            <div
                className={`
                    ${config.bgColor} ${config.textColor} 
                    rounded-2xl p-6 shadow-2xl ${config.glowColor}
                    ring-4 ${config.ringColor}
                    transform transition-all duration-500 ease-out
                    hover:scale-105
                `}
            >
                {/* Icon and Label */}
                <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-5xl font-bold animate-pulse">{config.icon}</span>
                    <h2 className="text-4xl font-bold uppercase tracking-wide">
                        {config.label}
                    </h2>
                </div>

                {/* Confidence Percentage */}
                {confidence !== undefined && (
                    <div className="text-center mt-4">
                        <div className="text-sm uppercase tracking-wider opacity-90 mb-1">
                            Confidence
                        </div>
                        <div className="text-3xl font-bold">
                            {Math.round(confidence)}%
                        </div>
                    </div>
                )}

                {/* Allowlist Indicator */}
                {allowlistApplied && (
                    <div className="absolute top-3 right-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1">
                            <span>🛡️</span>
                            <span>Verified</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Animated pulse ring */}
            <div
                className={`
                    absolute inset-0 rounded-2xl ${config.ringColor} 
                    animate-ping opacity-20 pointer-events-none
                `}
                style={{ animationDuration: '2s' }}
            />
        </div>
    );
}

// Skeleton loader for RiskBadge
export function RiskBadgeSkeleton() {
    return (
        <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl p-6 shadow-xl animate-pulse">
            <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="w-40 h-10 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
            <div className="text-center mt-4">
                <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded mx-auto mb-2" />
                <div className="w-16 h-8 bg-gray-300 dark:bg-gray-600 rounded mx-auto" />
            </div>
        </div>
    );
}
