import React from 'react';
import { RiskLevel } from './RiskBadge';

export interface HistoryItem {
    id: string;
    timestamp: number;
    riskLevel: RiskLevel;
    url?: string;
    qrType?: string;
    decodedText: string;
}

interface HistoryPanelProps {
    items: HistoryItem[];
    onItemClick: (item: HistoryItem) => void;
    onClear: () => void;
    className?: string;
}

export default function HistoryPanel({ items, onItemClick, onClear, className = '' }: HistoryPanelProps) {
    const getRelativeTime = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const getRiskBadgeStyle = (riskLevel: RiskLevel) => {
        const styles = {
            safe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-green-500/30',
            suspicious: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 ring-yellow-500/30',
            dangerous: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-red-500/30',
        };
        return styles[riskLevel];
    };

    const getRiskIcon = (riskLevel: RiskLevel) => {
        const icons = {
            safe: '✓',
            suspicious: '⚠',
            dangerous: '✕',
        };
        return icons[riskLevel];
    };

    if (items.length === 0) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Scan History
                </h3>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No scans yet</p>
                    <p className="text-xs mt-1">Your recent scans will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Scan History
                </h3>
                <button
                    onClick={onClear}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                    Clear All
                </button>
            </div>

            {/* History Items */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                    >
                        <div className="flex items-start gap-3">
                            {/* Risk Badge */}
                            <div className={`
                                flex-shrink-0 w-8 h-8 rounded-full 
                                flex items-center justify-center
                                ring-2 ${getRiskBadgeStyle(item.riskLevel)}
                                text-sm font-bold
                            `}>
                                {getRiskIcon(item.riskLevel)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {item.qrType && item.qrType !== 'http' && item.qrType !== 'text'
                                            ? `${item.qrType.toUpperCase()} QR`
                                            : item.url || item.decodedText}
                                    </p>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {getRelativeTime(item.timestamp)}
                                    </span>
                                </div>
                                {item.url && item.qrType === 'http' && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                        {item.url}
                                    </p>
                                )}
                            </div>

                            {/* Arrow indicator */}
                            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                →
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
