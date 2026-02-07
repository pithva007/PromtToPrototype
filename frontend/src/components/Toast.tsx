import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number; // milliseconds
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [duration, onClose]);

    const configs = {
        success: {
            icon: '✓',
            bgColor: 'bg-green-500',
            textColor: 'text-white',
        },
        error: {
            icon: '✕',
            bgColor: 'bg-red-500',
            textColor: 'text-white',
        },
        info: {
            icon: 'ℹ',
            bgColor: 'bg-blue-500',
            textColor: 'text-white',
        },
        warning: {
            icon: '⚠',
            bgColor: 'bg-yellow-500',
            textColor: 'text-white',
        },
    };

    const config = configs[type];

    return (
        <div
            className={`
                ${config.bgColor} ${config.textColor}
                rounded-lg px-4 py-3 shadow-lg 
                flex items-center gap-3
                animate-slide-in-right
                max-w-md
            `}
        >
            <span className="text-xl font-bold">{config.icon}</span>
            <p className="flex-1 font-medium">{message}</p>
            <button
                onClick={onClose}
                className="hover:opacity-75 transition-opacity font-bold text-lg"
            >
                ×
            </button>
        </div>
    );
}

// Toast Container
interface ToastContainerProps {
    toasts: Array<{ id: string; message: string; type: ToastType }>;
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </div>
    );
}

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: ToastType }>>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return { toasts, showToast, removeToast };
}
