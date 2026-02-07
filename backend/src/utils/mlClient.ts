import axios, { AxiosError } from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT = 2000; // 2 seconds

export interface MLPrediction {
    label: 'benign' | 'malicious' | 'unknown';
    score: number;
}

export interface MLError {
    code: string;
    message: string;
}

/**
 * Call ML service to predict if URL is malicious
 */
export async function predictUrl(url: string): Promise<MLPrediction> {
    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict`,
            { url },
            {
                timeout: ML_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                throw {
                    code: 'ML_TIMEOUT',
                    message: 'ML service request timed out',
                } as MLError;
            }

            if (error.response?.status === 503) {
                throw {
                    code: 'ML_UNAVAILABLE',
                    message: 'ML service is unavailable',
                } as MLError;
            }

            if (error.code === 'ECONNREFUSED') {
                throw {
                    code: 'ML_UNAVAILABLE',
                    message: 'ML service is not running',
                } as MLError;
            }
        }

        throw {
            code: 'ML_ERROR',
            message: 'ML prediction failed',
        } as MLError;
    }
}

/**
 * Check if ML service is healthy
 */
export async function checkMLServiceHealth(): Promise<boolean> {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, {
            timeout: 1000,
        });
        return response.status === 200;
    } catch {
        return false;
    }
}
