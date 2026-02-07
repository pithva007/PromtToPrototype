import { Request, Response } from 'express';
import { analyzeUrlWithML, AnalysisResult } from '../utils/urlAnalysis';

export type AnalyzeUrlResponse = AnalysisResult;

/**
 * Controller for POST /api/analyze-url
 * Analyzes URL with ML model and returns comprehensive report
 * Used by: Paste URL mode, Camera Scan mode
 */
export async function analyzeUrl(
    req: Request,
    res: Response<AnalyzeUrlResponse>
): Promise<void> {
    try {
        const { decodedText } = req.body;

        // Use shared analysis function - single source of truth
        const result = await analyzeUrlWithML(decodedText);

        // Set no-cache headers to prevent stale data
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // Return result (success or with ML error)
        const statusCode = result.success || result.error?.code === 'ML_UNAVAILABLE' ? 200 : 400;
        res.status(statusCode).json(result);
    } catch (error) {
        console.error('Error in analyzeUrl controller:', error);
        res.status(500).json({
            success: false,
            decodedText: '',
            isUrl: false,
            normalizedUrl: null,
            mlLabel: 'unknown',
            mlScore: 0,
            thresholdUsed: 0.8,
            attackVector: 'unknown',
            reasons: [],
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        });
    }
}
