import jsQR from 'jsqr';
import sharp from 'sharp';

/**
 * Maximum width for image processing (to prevent memory issues)
 */
const MAX_IMAGE_WIDTH = 1200;

export interface QRDecodeResult {
    success: boolean;
    decodedText: string | null;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * Decodes QR code from image buffer
 * Uses sharp to convert image to raw pixel data
 * Then uses jsQR to decode the QR code
 */
export async function decodeQRFromImage(
    imageBuffer: Buffer
): Promise<QRDecodeResult> {
    try {
        // Get image metadata first
        const metadata = await sharp(imageBuffer).metadata();

        if (!metadata.width || !metadata.height) {
            return {
                success: false,
                decodedText: null,
                error: {
                    code: 'INVALID_IMAGE',
                    message: 'Invalid image dimensions',
                },
            };
        }

        // Resize if image is too large (prevents memory issues)
        let processedImage = sharp(imageBuffer);

        if (metadata.width > MAX_IMAGE_WIDTH) {
            processedImage = processedImage.resize({
                width: MAX_IMAGE_WIDTH,
                fit: 'inside',
                withoutEnlargement: true,
            });
        }

        // Convert to raw pixel data (RGBA)
        const { data, info } = await processedImage
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Use jsQR to decode
        const qrCode = jsQR(
            new Uint8ClampedArray(data),
            info.width,
            info.height
        );

        if (!qrCode) {
            return {
                success: false,
                decodedText: null,
                error: {
                    code: 'QR_NOT_FOUND',
                    message: 'No QR code found in image',
                },
            };
        }

        return {
            success: true,
            decodedText: qrCode.data,
        };
    } catch (error) {
        console.error('QR decode error:', error);
        return {
            success: false,
            decodedText: null,
            error: {
                code: 'DECODE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to decode QR code',
            },
        };
    }
}
