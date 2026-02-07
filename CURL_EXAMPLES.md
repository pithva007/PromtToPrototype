# Safe-Scan Lite - ML-Powered cURL Examples

## 🤖 ML Service (FastAPI - Port 8000)

### Health Check
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "vectorizer": "loaded",
  "model": "loaded",
  "n_estimators": 50,
  "n_features": 5000
}
```

---

### Predict Benign URL
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.google.com"}'
```

**Expected Response:**
```json
{
  "label": "benign",
  "score": 0.12
}
```

---

### Predict Malicious URL (Phishing)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"http://phishing-login.tk/verify-account"}'
```

**Expected Response:**
```json
{
  "label": "malicious",
  "score": 0.89
}
```

---

### Predict Malicious URL (Malware)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"http://malware-download.ru/virus.exe"}'
```

**Expected Response:**
```json
{
  "label": "malicious",
  "score": 0.94
}
```

---

### Predict URL Shortener
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"http://bit.ly/suspicious123"}'
```

**Expected Response:**
```json
{
  "label": "malicious",
  "score": 0.76
}
```

---

### Invalid URL
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"not-a-valid-url"}'
```

**Expected Response:**
```json
{
  "label": "unknown",
  "score": 0.0
}
```

---

## 🔧 Backend API (Express - Port 3001)

### Analyze URL (Comprehensive)
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"https://www.google.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "decodedText": "https://www.google.com",
  "isUrl": true,
  "normalizedUrl": "https://www.google.com",
  "mlLabel": "benign",
  "mlScore": 0.12,
  "thresholdUsed": 0.6,
  "attackVector": "unknown",
  "reasons": [
    "URL appears safe (88.0% confidence)",
    "Uses secure HTTPS protocol",
    "Domain belongs to a well-known organization"
  ],
  "error": null
}
```

---

### Analyze Phishing URL
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"http://fake-bank.tk/login?verify=true"}'
```

**Expected Response:**
```json
{
  "success": true,
  "decodedText": "http://fake-bank.tk/login?verify=true",
  "isUrl": true,
  "normalizedUrl": "http://fake-bank.tk/login?verify=true",
  "mlLabel": "malicious",
  "mlScore": 0.92,
  "thresholdUsed": 0.6,
  "attackVector": "phishing",
  "reasons": [
    "ML model detected suspicious patterns (92.0% confidence)",
    "URL contains login/verification keywords commonly used in phishing attacks",
    "URL uses a high-risk top-level domain"
  ],
  "error": null
}
```

---

### Analyze Malware URL
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"http://malware-site.xyz/download/setup.exe"}'
```

**Expected Response:**
```json
{
  "success": true,
  "decodedText": "http://malware-site.xyz/download/setup.exe",
  "isUrl": true,
  "normalizedUrl": "http://malware-site.xyz/download/setup.exe",
  "mlLabel": "malicious",
  "mlScore": 0.95,
  "thresholdUsed": 0.6,
  "attackVector": "malware",
  "reasons": [
    "ML model detected suspicious patterns (95.0% confidence)",
    "URL points to executable files or download pages",
    "URL uses a high-risk top-level domain"
  ],
  "error": null
}
```

---

### Analyze Payment Scam
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"http://scam-upi.tk/collect?amount=5000"}'
```

**Expected Response:**
```json
{
  "success": true,
  "decodedText": "http://scam-upi.tk/collect?amount=5000",
  "isUrl": true,
  "normalizedUrl": "http://scam-upi.tk/collect?amount=5000",
  "mlLabel": "malicious",
  "mlScore": 0.88,
  "thresholdUsed": 0.6,
  "attackVector": "payment-scam",
  "reasons": [
    "ML model detected suspicious patterns (88.0% confidence)",
    "URL contains payment-related keywords often used in scams",
    "URL uses a high-risk top-level domain"
  ],
  "error": null
}
```

---

### Analyze Non-URL
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"Hello World"}'
```

**Expected Response:**
```json
{
  "success": true,
  "decodedText": "Hello World",
  "isUrl": false,
  "normalizedUrl": null,
  "mlLabel": "unknown",
  "mlScore": 0,
  "thresholdUsed": 0.6,
  "attackVector": "unknown",
  "reasons": ["Not a valid URL"],
  "error": null
}
```

---

### ML Service Unavailable
```bash
# Stop ML service first, then:
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"https://example.com"}'
```

**Expected Response:**
```json
{
  "success": false,
  "decodedText": "https://example.com",
  "isUrl": true,
  "normalizedUrl": "https://example.com",
  "mlLabel": "unknown",
  "mlScore": 0,
  "thresholdUsed": 0.6,
  "attackVector": "unknown",
  "reasons": ["ML service unavailable - manual review recommended"],
  "error": {
    "code": "ML_UNAVAILABLE",
    "message": "ML service is not running"
  }
}
```

---

## 🧪 End-to-End Test (QR Decode + ML Analysis)

### Step 1: Create a QR code
Visit https://www.qr-code-generator.com/ and encode: `http://phishing-site.tk/login`

### Step 2: Save as qr-test.png

### Step 3: Upload and analyze
```bash
curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@qr-test.png"
```

This returns the decoded URL, then the frontend automatically calls `/api/analyze-url` for ML classification.

---

**All examples assume services are running:**
- ML Service: `http://localhost:8000`
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`
