import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import qrRoutes from './routes/qr.routes';
import analyzeUrlRoutes from './routes/analyzeUrl.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Debug: Check environment variables
console.log('----------------------------------------');
console.log('🔧 Backend Configuration:');
console.log(`   ML_THRESHOLD: ${process.env.ML_THRESHOLD}`);
console.log(`   SAFE_OVERRIDE_MAX: ${process.env.SAFE_OVERRIDE_MAX}`);
console.log(`   SAFE_DOMAINS loaded: ${!!process.env.SAFE_DOMAINS}`);
console.log('----------------------------------------');
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// CORS configuration
app.use(
    cors({
        origin: CORS_ORIGIN,
        credentials: true,
    })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/qr', qrRoutes);
app.use('/api', analyzeUrlRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
    });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Global error handler:', err);

    // Handle Multer errors
    if (err.message.includes('File too large')) {
        res.status(400).json({
            success: false,
            decodedText: null,
            isUrl: false,
            normalizedUrl: null,
            error: {
                code: 'FILE_TOO_LARGE',
                message: 'File size exceeds 5MB limit',
            },
        });
        return;
    }

    if (err.message.includes('Invalid file type')) {
        res.status(400).json({
            success: false,
            decodedText: null,
            isUrl: false,
            normalizedUrl: null,
            error: {
                code: 'INVALID_FILE_TYPE',
                message: err.message,
            },
        });
        return;
    }

    // Generic error
    res.status(500).json({
        success: false,
        decodedText: null,
        isUrl: false,
        normalizedUrl: null,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
        },
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Safe-Scan Backend running on http://localhost:${PORT}`);
    console.log(`📡 CORS enabled for: ${CORS_ORIGIN}`);
});
