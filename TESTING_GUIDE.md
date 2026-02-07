# Testing the ML URL Detector - cURL Examples

## 1. Test ML Service Directly

### Health Check
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "20260207_104523",
  "vectorizer": "loaded",
  "model": "loaded",
  "n_estimators": 400,
  "n_features": 10000
}
```

### Predict Benign URL
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}'
```

**Expected Response:**
```json
{
  "label": "benign",
  "score": 0.0234,
  "model_version": "20260207_104523"
}
```

### Predict Malicious URL (Phishing)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "http://signin.apple-verify-account.tk/login"}'
```

**Expected Response:**
```json
{
  "label": "malicious",
  "score": 0.9876,
  "model_version": "20260207_104523"
}
```

### Predict Malicious URL (Malware)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "http://download-free.xyz/crack.exe"}'
```

**Expected Response:**
```json
{
  "label": "malicious",
  "score": 0.9654,
  "model_version": "20260207_104523"
}
```

### Invalid URL (Returns Unknown)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "not a url"}'
```

**Expected Response:**
```json
{
  "label": "unknown",
  "score": 0.0,
  "model_version": "20260207_104523"
}
```

---

## 2. Test Backend Integration

### QR Decode + ML Analysis (Complete Flow)

First, create a test QR code image or use an existing one. Then:

```bash
curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@/path/to/qr_code.png"
```

**Example Response (Benign URL):**
```json
{
  "success": true,
  "decodedText": "https://www.github.com",
  "isUrl": true,
  "normalizedUrl": "https://www.github.com",
  "mlLabel": "benign",
  "mlScore": 0.0123,
  "thresholdUsed": 0.6,
  "attackVector": "unknown",
  "reasons": [
    "URL appears safe (98.8% confidence)",
    "Uses secure HTTPS protocol",
    "Domain belongs to a well-known organization"
  ],
  "error": null
}
```

**Example Response (Malicious URL - Phishing):**
```json
{
  "success": true,
  "decodedText": "http://paypal-secure-login.tk/verify",
  "isUrl": true,
  "normalizedUrl": "http://paypal-secure-login.tk/verify",
  "mlLabel": "malicious",
  "mlScore": 0.9567,
  "thresholdUsed": 0.6,
  "attackVector": "phishing",
  "reasons": [
    "ML model detected suspicious patterns (95.7% confidence)",
    "URL contains login/verification keywords commonly used in phishing attacks",
    "URL uses a high-risk top-level domain"
  ],
  "error": null
}
```

**Example Response (Malicious URL - Malware):**
```json
{
  "success": true,
  "decodedText": "http://free-download.xyz/setup.exe",
  "isUrl": true,
  "normalizedUrl": "http://free-download.xyz/setup.exe",
  "mlLabel": "malicious",
  "mlScore": 0.9823,
  "thresholdUsed": 0.6,
  "attackVector": "malware",
  "reasons": [
    "ML model detected suspicious patterns (98.2% confidence)",
    "URL points to executable files or download pages",
    "URL uses a high-risk top-level domain"
  ],
  "error": null
}
```

**Example Response (ML Service Unavailable):**
```json
{
  "success": true,
  "decodedText": "https://example.com",
  "isUrl": true,
  "normalizedUrl": "https://example.com",
  "mlLabel": "unknown",
  "mlScore": 0,
  "thresholdUsed": 0.6,
  "attackVector": "unknown",
 "reasons": [
    "ML service unavailable - manual review recommended"
  ],
  "error": {
    "code": "ML_UNAVAILABLE",
    "message": "ML service error"
  }
}
```

---

## 3. Create Test QR Code Images

### Using Python (qrcode library)

```python
import qrcode

# Benign URL
qr_benign = qrcode.make("https://www.github.com")
qr_benign.save("qr_benign.png")

# Phishing URL (simulated)
qr_phishing = qrcode.make("http://signin.apple-id-verify.tk/login")
qr_phishing.save("qr_phishing.png")

# Malware URL (simulated)
qr_malware = qrcode.make("http://download-crack.xyz/setup.exe")
qr_malware.save("qr_malware.png")

# Payment Scam URL (simulated)
qr_payment = qrcode.make("upi://pay?pa=scammer@paytm&pn=Refund&am=5000")
qr_payment.save("qr_payment.png")

# URL Shortener (redirect)
qr_redirect = qrcode.make("http://bit.ly/suspicious")
qr_redirect.save("qr_redirect.png")
```

Then test:
```bash
curl -X POST http://localhost:3001/api/qr/decode -F "file=@qr_phishing.png"
```

### Using Online QR Generator

1. Go to https://www.qr-code-generator.com/
2. Enter test URLs:
   - Benign: `https://www.google.com`
   - Phishing: `http://paypal-verify-login.tk/secure`
   - Malware: `http://free-software.xyz/download.exe`
3. Download generated QR codes
4. Test with cURL

---

## 4. Test Non-URL QR Codes

```bash
# Create QR with plain text
python3 -c "import qrcode; qrcode.make('Hello World').save('qr_text.png')"

# Test
curl -X POST http://localhost:3001/api/qr/decode -F "file=@qr_text.png"
```

**Expected Response:**
```json
{
  "success": true,
  "decodedText": "Hello World",
  "isUrl": false,
  "normalizedUrl": null,
  "error": null
}
```

Note: ML analysis is NOT run for non-URL content.

---

## 5. Test Error Cases

### No QR Code in Image
```bash
curl -X POST http://localhost:3001/api/qr/decode -F "file=@random_image.png"
```

**Expected Response:**
```json
{
  "success": false,
  "decodedText": null,
  "isUrl": false,
  "normalizedUrl": null,
  "error": {
    "code": "QR_NOT_FOUND",
    "message": "QR code not found in image"
  }
}
```

### Invalid File Type
```bash
curl -X POST http://localhost:3001/api/qr/decode -F "file=@document.pdf"
```

**Expected Response:**
```json
{
  "success": false,
  "decodedText": null,
  "isUrl": false,
  "normalizedUrl": null,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Invalid file type. Allowed types: image/png, image/jpeg, image/webp"
  }
}
```

### No File Uploaded
```bash
curl -X POST http://localhost:3001/api/qr/decode
```

**Expected Response:**
```json
{
  "success": false,
  "decodedText": null,
  "isUrl": false,
  "normalizedUrl": null,
  "error": {
    "code": "NO_FILE_UPLOADED",
    "message": "No file uploaded"
  }
}
```

---

## 6. Performance Testing

### Test Response Time
```bash
time curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com"}'
```

Expected: < 50ms for ML prediction

### Load Testing (with apache bench)
```bash
# Install apache bench: brew install httpd (macOS)

# Test 1000 requests with 10 concurrent
ab -n 1000 -c 10 -p test_url.json -T application/json \
  http://localhost:8000/predict
```

Where `test_url.json`:
```json
{"url": "https://www.google.com"}
```

---

## 7. Frontend Testing

### Direct Browser Test
1. Open http://localhost:3000/scan
2. Upload QR code image
3. Click "Scan QR Code"
4. Observe:
   - Loading states
   - Risk badge color (green/yellow/red)
   - ML score display
   - Attack vector label
   - Reasons list

### Expected UI Behavior

**Safe URL (score < 0.4):**
- Badge: Green "Safe"
- Score: Low percentage
- Attack Vector: "Unknown" or blank
- Reasons: Positive indicators

**Suspicious URL (0.4 ≤ score < 0.6):**
- Badge: Yellow "Suspicious"
- Score: Medium percentage
- Attack Vector: May show type
- Reasons: Mixed indicators

**Dangerous URL (score ≥ 0.6):**
- Badge: Red "Dangerous"
- Score: High percentage
- Attack Vector: Phishing/Malware/Payment-scam/Redirect
- Reasons: Multiple red flags

---

## Quick Test Suite

Run all tests in sequence:

```bash
#!/bin/bash

echo "=== Testing ML Service ==="
curl -s http://localhost:8000/health | jq '.'

echo "\n=== Testing Benign URL ==="
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}' | jq '.'

echo "\n=== Testing Malicious URL ==="
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "http://phishing-site.tk/login"}' | jq '.'

echo "\n=== Testing Backend QR Decode ==="
curl -s -X POST http://localhost:3001/api/qr/decode \
  -F "file=@test_qr.png" | jq '.'

echo "\n=== All Tests Complete ==="
```

Save as `test_all.sh`, make executable (`chmod +x test_all.sh`), and run: `./test_all.sh`
