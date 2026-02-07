import { Request, Response } from 'express';
import { decodeQRFromImage } from '../utils/qrDecoder';
import {
    ErrorCodes,
    isValidMimeType,
    isValidFileSize,
    isValidUrl,
    normalizeUrl,
} from '../utils/validators';

export interface QRDecodeResponse {
    success: boolean;
    decodedText: string | null;
    isUrl: boolean;
    normalizedUrl: string | null;
    error: {
        code: string;
        message: string;
    } | null;
}

/**
 * Controller for POST /api/qr/decode
 * Handles QR code decoding from uploaded image
 */
export async function decodeQRCode(
    req: Request,
    res: Response<QRDecodeResponse>
): Promise<void> {
    try {
        // Check if file exists
        if (!req.file) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.NO_FILE_UPLOADED,
                    message: 'No file uploaded',
                },
            });
            return;
        }

        const { mimetype, size, buffer } = req.file;

        // Validate MIME type
        if (!isValidMimeType(mimetype)) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.INVALID_FILE_TYPE,
                    message: 'Invalid file type. Only PNG, JPG, and WebP are allowed.',
                },
            });
            return;
        }

        // Validate file size
        if (!isValidFileSize(size)) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.FILE_TOO_LARGE,
                    message: 'File size exceeds 5MB limit',
                },
            });
            return;
        }

        // Decode QR code
        const decodeResult = await decodeQRFromImage(buffer);

        if (!decodeResult.success || !decodeResult.decodedText) {
            res.status(400).json({
                success: false,
                decodedText: null,
                isUrl: false,
                normalizedUrl: null,
                error: {
                    code: ErrorCodes.QR_NOT_FOUND,
                    message: decodeResult.error || 'No QR code found in image',
                },
            });
            return;
        }

        const decodedText = decodeResult.decodedText;
        const isUrl = isValidUrl(decodedText);
        const normalizedUrl = isUrl ? normalizeUrl(decodedText) : null;

        // Success response
        res.status(200).json({
            success: true,
            decodedText,
            isUrl,
            normalizedUrl,
            error: null,
        });
    } catch (error) {
        console.error('Error in decodeQRCode controller:', error);
        res.status(500).json({
            success: false,
            decodedText: null,
            isUrl: false,
            normalizedUrl: null,
            error: {
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Internal server error',
            },
        });
    }
}
