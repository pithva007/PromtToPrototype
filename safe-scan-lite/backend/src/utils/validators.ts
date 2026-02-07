// Error codes for API responses
export const ErrorCodes = {
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    QR_NOT_FOUND: 'QR_NOT_FOUND',
    DECODE_FAILED: 'DECODE_FAILED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Allowed MIME types for upload
export const ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
];

// Maximum file size (5MB)
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);

/**
 * Validates if the MIME type is allowed
 */
export function isValidMimeType(mimetype: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimetype);
}

/**
 * Validates if the file size is within limits
 */
export function isValidFileSize(size: number): boolean {
    return size <= MAX_FILE_SIZE;
}

/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(text: string): boolean {
    try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        // Check if it looks like a URL without protocol
        const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
        return urlPattern.test(text);
    }
}

/**
 * Normalizes a URL by adding https:// if missing
 * Only adds protocol if the text looks like a valid domain
 */
export function normalizeUrl(text: string): string | null {
    if (!isValidUrl(text)) {
        return null;
    }

    try {
        new URL(text);
        return text; // Already has protocol
    } catch {
        // Add https:// prefix for domain-like strings
        return `https://${text}`;
    }
}
