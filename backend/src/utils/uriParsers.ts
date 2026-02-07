/**
 * URI Parsers for Non-HTTP QR Codes
 * Supports: UPI, Phone, Email, SMS, WiFi, Geographic coordinates
 */

export type QRType = 'http' | 'upi' | 'phone' | 'email' | 'sms' | 'wifi' | 'geo' | 'text';

export interface ParsedQRData {
    qrType: QRType;
    rawText: string;
    parsedData?: Record<string, any>;
}

export interface UPIData {
    payeeAddress: string;      // pa - UPI ID
    payeeName?: string;         // pn
    amount?: string;            // am
    currency?: string;          // cu
    transactionNote?: string;   // tn
    transactionRef?: string;    // tr
    merchantCode?: string;      // mc
    aid?: string;               // aid
    detectedApp?: string;       // Detected from UPI ID suffix
}

export interface PhoneData {
    phoneNumber: string;
    formattedNumber: string;
    countryCode?: string;
}

export interface EmailData {
    email: string;
    subject?: string;
    body?: string;
}

export interface SMSData {
    phoneNumber: string;
    message?: string;
}

export interface WiFiData {
    ssid: string;
    securityType: 'WPA' | 'WEP' | 'Open' | 'Unknown';
    password?: string;
    hidden?: boolean;
}

export interface GeoData {
    latitude: number;
    longitude: number;
    query?: string;
}

/**
 * Main parser - detects QR type and routes to specific parser
 */
export function parseQRCode(text: string): ParsedQRData {
    const lowerText = text.toLowerCase();

    // UPI Payment
    if (lowerText.startsWith('upi://')) {
        const upiData = parseUPI(text);
        return {
            qrType: 'upi',
            rawText: text,
            parsedData: upiData || undefined,
        };
    }

    // Phone Number
    if (lowerText.startsWith('tel:') || lowerText.startsWith('callto:')) {
        const phoneData = parsePhone(text);
        return {
            qrType: 'phone',
            rawText: text,
            parsedData: phoneData || undefined,
        };
    }

    // Email
    if (lowerText.startsWith('mailto:')) {
        const emailData = parseEmail(text);
        return {
            qrType: 'email',
            rawText: text,
            parsedData: emailData || undefined,
        };
    }

    // SMS
    if (lowerText.startsWith('sms:') || lowerText.startsWith('smsto:')) {
        const smsData = parseSMS(text);
        return {
            qrType: 'sms',
            rawText: text,
            parsedData: smsData || undefined,
        };
    }

    // WiFi
    if (lowerText.startsWith('wifi:')) {
        const wifiData = parseWiFi(text);
        return {
            qrType: 'wifi',
            rawText: text,
            parsedData: wifiData || undefined,
        };
    }

    // Geographic
    if (lowerText.startsWith('geo:')) {
        const geoData = parseGeo(text);
        return {
            qrType: 'geo',
            rawText: text,
            parsedData: geoData || undefined,
        };
    }

    // HTTP/HTTPS (already handled by isValidUrl, but for completeness)
    if (lowerText.startsWith('http://') || lowerText.startsWith('https://')) {
        return {
            qrType: 'http',
            rawText: text,
        };
    }

    // Plain text
    return {
        qrType: 'text',
        rawText: text,
    };
}

/**
 * Parse UPI Payment URL
 * Format: upi://pay?pa=merchant@paytm&pn=Name&am=100&cu=INR&tn=Note
 */
export function parseUPI(url: string): UPIData | null {
    try {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;

        const payeeAddress = params.get('pa');
        if (!payeeAddress) return null;

        const upiData: UPIData = {
            payeeAddress,
            payeeName: params.get('pn') || undefined,
            amount: params.get('am') || undefined,
            currency: params.get('cu') || 'INR',
            transactionNote: params.get('tn') || undefined,
            transactionRef: params.get('tr') || undefined,
            merchantCode: params.get('mc') || undefined,
            aid: params.get('aid') || undefined,
        };

        // Detect app from UPI ID
        const upiIdLower = payeeAddress.toLowerCase();
        if (upiIdLower.includes('@paytm')) {
            upiData.detectedApp = 'Paytm';
        } else if (upiIdLower.includes('@ybl')) {
            upiData.detectedApp = 'PhonePe';
        } else if (upiIdLower.includes('@okaxis') || upiIdLower.includes('@oksbi') || upiIdLower.includes('@okicici')) {
            upiData.detectedApp = 'Google Pay';
        } else if (upiIdLower.includes('@upi')) {
            upiData.detectedApp = 'BHIM';
        }

        return upiData;
    } catch (error) {
        return null;
    }
}

/**
 * Validate UPI for security risks
 */
export interface UPIValidation {
    isSuspicious: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    warnings: string[];
}

export function validateUPI(upiData: UPIData): UPIValidation {
    const warnings: string[] = [];
    let riskLevel: 'safe' | 'warning' | 'danger' = 'safe';

    // Check for suspicious keywords in beneficiary name
    const suspiciousKeywords = [
        'refund', 'verify', 'verification', 'urgent', 'prize', 'reward',
        'customer care', 'support', 'helpline', 'confirm', 'otp',
        'block', 'suspended', 'kyc', 'update', 'expire', 'claim'
    ];

    const nameLower = (upiData.payeeName || '').toLowerCase();
    const foundKeywords = suspiciousKeywords.filter(kw => nameLower.includes(kw));
    
    if (foundKeywords.length > 0) {
        warnings.push(`Beneficiary name contains suspicious keywords: ${foundKeywords.join(', ')}`);
        riskLevel = 'danger';
    }

    // Check for suspicious UPI ID patterns
    const upiIdLower = upiData.payeeAddress.toLowerCase();
    const phishingPatterns = [
        'paytm', 'phonepe', 'googlepay', 'gpay', 'bhim', 'amazon',
        'flipkart', 'bank', 'govt', 'income', 'tax', 'refund'
    ];

    // Extract username part before @
    const username = upiIdLower.split('@')[0];
    const foundPatterns = phishingPatterns.filter(pattern => username.includes(pattern));

    if (foundPatterns.length > 0 && !upiData.detectedApp) {
        warnings.push(`UPI ID contains brand names but not from official provider: ${foundPatterns.join(', ')}`);
        riskLevel = 'danger';
    }

    // Check for unknown/suspicious UPI providers
    const knownProviders = [
        '@paytm', '@ybl', '@okaxis', '@oksbi', '@okicici', '@okhdfc',
        '@upi', '@axl', '@icici', '@sbi', '@hdfc', '@apl'
    ];

    const provider = '@' + upiIdLower.split('@')[1];
    if (!knownProviders.some(known => provider.includes(known))) {
        warnings.push('Unknown or uncommon UPI provider detected');
        riskLevel = riskLevel === 'safe' ? 'warning' : riskLevel;
    }

    // Check for excessive amounts (potential scam)
    if (upiData.amount) {
        const amount = parseFloat(upiData.amount);
        if (amount > 10000) {
            warnings.push(`High payment amount detected: ₹${amount}`);
            riskLevel = riskLevel === 'safe' ? 'warning' : riskLevel;
        }
        if (amount > 50000) {
            warnings.push('Extremely high payment amount - verify authenticity!');
            riskLevel = 'danger';
        }
    }

    // Check transaction note for suspicious patterns
    const noteLower = (upiData.transactionNote || '').toLowerCase();
    if (suspiciousKeywords.some(kw => noteLower.includes(kw))) {
        warnings.push('Transaction note contains suspicious keywords');
        riskLevel = riskLevel === 'safe' ? 'warning' : riskLevel;
    }

    return {
        isSuspicious: warnings.length > 0,
        riskLevel,
        warnings,
    };
}

/**
 * Parse Phone Number
 * Format: tel:+919876543210
 */
export function parsePhone(url: string): PhoneData | null {
    try {
        const phoneNumber = url.replace(/^(tel:|callto:)/i, '').trim();
        const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        return {
            phoneNumber,
            formattedNumber: formatted,
            countryCode: formatted.match(/^\+(\d{1,3})/)?.[1],
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse Email
 * Format: mailto:user@example.com?subject=Hello&body=Message
 */
export function parseEmail(url: string): EmailData | null {
    try {
        const urlObj = new URL(url);
        const email = urlObj.pathname;
        const params = urlObj.searchParams;

        return {
            email,
            subject: params.get('subject') || undefined,
            body: params.get('body') || undefined,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse SMS
 * Format: sms:+919876543210?body=Hello
 */
export function parseSMS(url: string): SMSData | null {
    try {
        const urlObj = new URL(url);
        const phoneNumber = urlObj.pathname;
        const params = urlObj.searchParams;

        return {
            phoneNumber,
            message: params.get('body') || undefined,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse WiFi
 * Format: WIFI:T:WPA;S:NetworkName;P:password123;H:false;;
 */
export function parseWiFi(text: string): WiFiData | null {
    try {
        const wifiRegex = /WIFI:T:([^;]*);S:([^;]*);(?:P:([^;]*);)?(?:H:([^;]*);)?/i;
        const match = text.match(wifiRegex);

        if (!match) return null;

        const [, type, ssid, password, hidden] = match;

        return {
            ssid: ssid || 'Unknown',
            securityType: (type?.toUpperCase() as any) || 'Unknown',
            password: password || undefined,
            hidden: hidden?.toLowerCase() === 'true',
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse Geographic Coordinates
 * Format: geo:37.7749,-122.4194?q=San Francisco
 */
export function parseGeo(url: string): GeoData | null {
    try {
        const urlObj = new URL(url);
        const coords = urlObj.pathname.split(',');

        if (coords.length < 2) return null;

        const latitude = parseFloat(coords[0]);
        const longitude = parseFloat(coords[1]);

        if (isNaN(latitude) || isNaN(longitude)) return null;

        return {
            latitude,
            longitude,
            query: urlObj.searchParams.get('q') || undefined,
        };
    } catch (error) {
        return null;
    }
}
