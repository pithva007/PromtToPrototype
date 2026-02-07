# Safe-Scan Lite - Complete Setup Guide 🚀

## Overview

Safe-Scan Lite is a production-grade QR code scanner with AI-powered malicious URL detection using Random Forest machine learning.

**Features:**
- 📷 QR code image upload and decoding
- 🤖 ML-powered URL threat detection
- 🎯 Attack vector classification (phishing, malware, payment scams, redirects)
- 📊 Risk scoring with confidence levels
- 🎨 Modern, responsive UI with dark mode
- 🔒 Production-ready security features

---

## System Requirements

- **Node.js**: 18+ and npm
- **Python**: 3.10+
- **Git**

---

## 📁 Project Structure

```
PtoP/
├── ml/                    # Python ML Service
│   ├── app.py            # FastAPI inference server
│   ├── train_model.py    # Model training script
│   ├── sample_data.csv   # Sample training dataset
│   ├── requirements.txt  # Python dependencies
│   ├── artifacts/        # Trained models (generated)
│   └── ML_README.md      # ML service docs
│
├── backend/              # Express API
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── qr.controller.ts
│   │   │   └── analyzeUrl.controller.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   │       ├── mlClient.ts
│   │       └── validators.ts
│   ├── package.json
│   └── .env
│
├── frontend/             # Next.js 14 App
│   ├── src/app/
│   │   ├── scan/page.tsx
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── package.json
│   └── .env.local
│
├── README.md
├── CURL_EXAMPLES.md
└── SETUP.md (this file)
```

---

## 🔧 Installation

### 1. ML Service Setup

```bash
cd /Users/khushpithva/Documents/PtoP/ml

# Install Python dependencies
pip install -r requirements.txt

# Train the ML model (IMPORTANT - do this first!)
python train_model.py
```

**Expected output:**
- Training metrics (accuracy, precision, recall, F1)
- Confusion matrix
- Top feature importances
- Models saved to `artifacts/tfidf.joblib` and `artifacts/rf.joblib`

### 2. Backend Setup

```bash
cd /Users/khushpithva/Documents/PtoP/backend

# Install Node dependencies (already done if you ran before)
npm install

# Environment variables are already configured in .env
# ML_SERVICE_URL=http://localhost:8000
# ML_THRESHOLD=0.60
```

### 3. Frontend Setup

```bash
cd /Users/khushpithva/Documents/PtoP/frontend

# Install dependencies (already done if you ran before)
npm install

# Environment is configured in .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🚀 Running the Application

You need **3 terminal windows** running simultaneously:

### Terminal 1: ML Service (Port 8000)

```bash
cd /Users/khushpithva/Documents/PtoP/ml
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Verify**: Visit http://localhost:8000/health
```json
{
  "status": "healthy",
  "vectorizer": "loaded",
  "model": "loaded"
}
```

### Terminal 2: Backend (Port 3001)

```bash
cd /Users/khushpithva/Documents/PtoP/backend
npm run dev
```

**Verify**: Visit http://localhost:3001/health
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Terminal 3: Frontend (Port 3000)

```bash
cd /Users/khushpithva/Documents/PtoP/frontend
npm run dev
```

**Verify**: Visit http://localhost:3000

---

## 🧪 Testing the Integration

### Quick Test

1. **Open**: http://localhost:3000/scan
2. **Generate Test QR**: Visit https://www.qr-code-generator.com/
3. **Encode**: `http://phishing-login.tk/verify-account`
4. **Download**: Save as PNG
5. **Upload**: Drag/drop or click to upload
6. **Scan**: Click "Scan QR Code"
7. **Result**: Should show "Dangerous URL" with phishing attack vector

### cURL Tests

See [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) for comprehensive API testing.

**Quick test:**
```bash
# Test ML service directly
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"http://phishing-site.tk/login"}'

# Test backend analysis
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"decodedText":"http://malware.exe/download"}'
```

---

## 📊 Understanding the ML Model

### Training Dataset

Located at `ml/sample_data.csv` with 50 URLs (25 benign, 25 malicious)

**Format:**
```csv
url,label
https://www.google.com,benign
http://phishing-site.tk/login,malicious
```

### Model Performance

With default settings (50 trees), expect:
- **Accuracy**: ~85-95%
- **Precision**: ~80-90%
- **Recall**: ~85-95%
- **F1 Score**: ~85-90%

### Attack Vector Detection

The backend classifies threats into:
- **🎣 Phishing**: login, verify, password, otp keywords
- **🦠 Malware**: .exe, .apk, download keywords  
- **💸 Payment Scam**: upi, pay, collect keywords
- **🔀 Redirect**: URL shorteners (bit.ly, tinyurl)

---

## 🎨 UI Features

### Risk Levels

- **✓ Safe** (Green): ML score < 0.4, benign classification
- **⚠ Suspicious** (Yellow): ML score 0.4-0.6 or unknown
- **✕ Danger** (Red): ML score > 0.6, malicious classification

### Result Card Shows:

1. **Risk Badge**: Visual indicator with icon
2. **Threat Score**: Progress bar (0-100%)
3. **Attack Vector**: Classified threat type
4. **Decoded URL**: Original QR content
5. **Analysis Details**: Human-readable reasons
6. **Actions**: Open (if safe) or Copy URL

---

## 🔐 Security Features

### ML Service
- ✅ No network calls (text-only analysis)
- ✅ Input validation (max 2048 chars)
- ✅ Graceful error handling

### Backend
- ✅ Rate limiting (100 req/15min)
- ✅ CORS restricted to frontend
- ✅ File size limits (5MB)
- ✅ MIME type validation
- ✅ Timeout on ML calls (2s)

### Frontend
- ✅ Client-side validation
- ✅ URLs don't auto-open
- ✅ Safe external link handling

---

## 🐛 Troubleshooting

### ML Service Issues

**Error: Models not found**
```bash
cd ml
python train_model.py
```

**Error: Port 8000 already in use**
```bash
# Find and kill process
lsof -ti:8000 | xargs kill -9
```

### Backend Issues

**Error: Cannot connect to ML service**
- Check ML service is running on port 8000
- Verify `ML_SERVICE_URL=http://localhost:8000` in backend/.env

**Error: Module 'axios' not found**
```bash
cd backend
npm install axios
```

### Frontend Issues

**Error: Cannot connect to backend**
- Check backend is running on port 3001
- Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in frontend/.env.local

---

## 📈 Adding More Training Data

### Expand Dataset

1. **Create**: `ml/custom_data.csv`
2. **Format**:
```csv
url,label
https://your-url-1.com,benign
http://suspicious-url-2.tk,malicious
```

3. **Train**:
```bash
cd ml
python train_model.py custom_data.csv
```

4. **Restart ML service**:
```bash
uvicorn app:app --reload
```

### Tips for Better Accuracy

- **Balance**: Equal benign/malicious samples
- **Quantity**: 100+ URLs per class minimum
- **Variety**: Mix of attack types and legitimate sites
- **Quality**: Accurate labels are crucial

---

## 🚢 Production Deployment

### ML Service

```bash
# Install in production mode
pip install -r requirements.txt

# Run with Gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

---

## 📚 Documentation

- **ML Service**: [ml/ML_README.md](./ml/ML_README.md)
- **cURL Examples**: [CURL_EXAMPLES.md](./CURL_EXAMPLES.md)
- **Main README**: [README.md](./README.md)

---

## ✨ Features Summary

| Feature | Status |
|---------|--------|
| QR Decode | ✅ |
| ML URL Detection | ✅ |
| Attack Vector Classification | ✅ |
| Risk Scoring | ✅ |
| Dark Mode | ✅ |
| Mobile Responsive | ✅ |
| Rate Limiting | ✅ |
| Error Handling | ✅ |
| Documentation | ✅ |

---

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review error messages in terminal
3. Check browser console for frontend errors
4. Verify all 3 services are running

---

**Built with ❤️ using Next.js, Express, FastAPI, and scikit-learn**
