# Safe-Scan Lite - QR Code Security Scanner

A premium **AI-powered QR code security scanner** that analyzes QR codes and URLs for potential security threats using machine learning. Features a modern, responsive UI with real-time camera scanning, file upload, and direct URL analysis.

![Safe-Scan Lite](https://img.shields.io/badge/Status-Production%20Ready-green)
![ML Accuracy](https://img.shields.io/badge/ML%20Accuracy-98.36%25-brightgreen)
![Node](https://img.shields.io/badge/Node-v18+-blue)
![Python](https://img.shields.io/badge/Python-3.8+-blue)

---

## 🌟 Features

### Core Functionality
- **3 Scanning Modes**
  - 📤 **Upload**: Scan QR codes from image files (PNG, JPG, WebP)
  - 📋 **Paste URL**: Direct URL security analysis
  - 📷 **Camera Scan**: Real-time QR code scanning using device camera

- **Multiple QR Code Types Supported**
  - HTTP/HTTPS URLs
  - UPI Payment QR codes (with fraud detection)
  - Phone numbers, Email addresses
  - WiFi credentials, SMS, Geo-coordinates
  - Plain text

### Premium UI Features
- **Risk Visualization**
  - Large risk badge (Safe/Suspicious/Dangerous) with confidence percentage
  - Animated risk meter (0-100 score) with threshold marker
  - Color-coded indicators (green/yellow/red)
  
- **Smart Analysis Display**
  - Toggle between Simple (3-bullet summary) and Technical (full details) explanations
  - Risk-based action buttons (Copy, Open URL, Report)
  - Toast notifications for user feedback
  
- **History & Persistence**
  - Last 10 scans saved in browser localStorage
  - Quick access to previous scans with timestamps
  - One-click history clearing

- **Design Excellence**
  - Dark mode support throughout
  - Mobile-first responsive design
  - Smooth animations and transitions
  - Premium gradients and shadows
  - Skeleton loaders for smooth UX

### Security Features
- **ML-Powered Threat Detection**
  - 98.36% accuracy on 641K URL dataset
  - Random Forest classifier with 400 trees
  - TF-IDF vectorization (10,000 features)
  - Optimal threshold: 0.425

- **Multi-Layer Analysis**
  - ML prediction (benign/malicious)
  - Domain allowlist (trusted sites like google.com, amazon.com)
  - UPI payment validation
  - Attack vector classification (phishing, malware, payment scam, redirect)
  - Risk banding (safe, suspicious, dangerous)

---

## 🏗️ Architecture

```
PromtToPrototype/
├── backend/          # Express.js API server (Node.js + TypeScript)
├── frontend/         # Next.js React app (TypeScript)
├── ml/               # FastAPI ML service (Python)
└── README.md         # This file
```

### Technology Stack

**Backend (Express.js)**
- TypeScript
- Express.js for REST API
- Sharp for image processing
- jsQR for QR code decoding
- Multer for file uploads
- CORS enabled

**Frontend (Next.js)**
- Next.js 14 with React
- TypeScript
- Tailwind CSS for styling
- @zxing/browser for camera QR scanning
- Custom premium components

**ML Service (FastAPI)**
- Python 3.8+
- FastAPI for ML API
- scikit-learn for ML models
- pandas for data processing
- uvicorn for serving

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+
- **Git**

### 1. Clone Repository
```bash
git clone <repository-url>
cd PromtToPrototype
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 4. ML Service Setup
```bash
cd ml
pip install -r requirements.txt

# Train the models (first time only, ~20-30 minutes)
python3 train_model.py

# Start the ML service
python3 -m uvicorn app:app --reload
# Runs on http://localhost:8000
```

### 5. Access Application
Open your browser and navigate to:
- **Frontend**: http://localhost:3000/scan
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:8000/docs

---

## 📂 Project Structure

### Backend (`/backend`)
```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── qr.controller.ts           # QR file upload & decode
│   │   ├── decodeText.controller.ts   # Camera scan & paste URL
│   │   └── analyzeUrl.controller.ts   # Legacy URL analysis
│   ├── routes/            # API route definitions
│   ├── utils/             # Helper functions
│   │   ├── qrDecoder.ts              # QR decoding with Sharp & jsQR
│   │   ├── uriParsers.ts             # Parse UPI, WiFi, email, etc.
│   │   ├── urlNormalizer.ts          # URL normalization
│   │   └── mlService.ts              # ML API integration
│   ├── config/            # Configuration files
│   │   ├── allowlist.ts              # Trusted domains
│   │   └── safeDomains.txt
│   └── index.ts           # Express server setup
└── package.json
```

**Key API Endpoints:**
- `POST /api/qr/decode` - Upload QR code image for analysis
- `POST /api/qr/decode-text` - Analyze decoded QR text or URL
- `POST /api/analyze-url` - Legacy URL analysis endpoint

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home page
│   │   ├── scan/page.tsx         # Main scan page (PREMIUM UI)
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles + animations
│   └── components/
│       ├── RiskBadge.tsx         # Premium risk indicator
│       ├── RiskMeter.tsx         # Animated risk score (0-100)
│       ├── HistoryPanel.tsx      # Scan history with localStorage
│       ├── Toast.tsx             # Notification system
│       ├── CameraModal.tsx       # Camera QR scanning
│       └── ResultCard.tsx        # Detailed analysis results
└── package.json
```

### ML Service (`/ml`)
```
ml/
├── app.py                 # FastAPI application
├── train_model.py         # Model training script
├── artifacts/             # Trained models (generated)
│   ├── rf.joblib         # Random Forest model
│   ├── tfidf.joblib      # TF-IDF vectorizer
│   └── metadata.json     # Model metadata
├── data/
│   └── all_urls.csv      # Training dataset (641K URLs)
└── requirements.txt
```

---

## 🔧 Configuration

### Backend Environment Variables
Create `backend/.env`:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
ML_TIMEOUT=5000
SAFE_OVERRIDE_MAX=0.99
```

### Frontend Environment Variables
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🧪 ML Model Details

### Training Data
- **Dataset**: 641,119 URLs
- **Benign URLs**: 428,103 (66.8%)
- **Malicious URLs**: 213,016 (33.2%)

### Model Performance
- **Accuracy**: 98.36%
- **Precision**: 98.57%
- **Recall**: 96.47%
- **F1 Score**: 97.51%

### Training Split
- **Training Set**: 512,911 URLs (80%)
- **Test Set**: 128,228 URLs (20%)

### Model Architecture
- **Algorithm**: Random Forest Classifier
- **Trees**: 400
- **Features**: TF-IDF vectorization (10,000 features)
- **Optimal Threshold**: 0.425
- **Model Version**: 20260207_152249

### Retraining
```bash
cd ml
python3 train_model.py
# Takes ~20-30 minutes
# Models saved to ml/artifacts/
```

---

## 🎯 How It Works

### Upload Mode Flow
1. User uploads QR code image (PNG/JPG/WebP)
2. Backend decodes QR using Sharp + jsQR
3. Backend parses QR type (UPI, URL, WiFi, etc.)
4. For URLs: ML service analyzes threat level
5. Backend applies allowlist & computes risk band
6. Frontend displays premium risk visualization
7. Scan saved to history (localStorage)

### Paste URL Mode Flow
1. User enters URL directly
2. Backend receives URL via `/api/qr/decode-text`
3. ML service analyzes threat level
4. Backend applies allowlist & computes risk band
5. Frontend displays results same as upload mode

### Camera Scan Mode Flow
1. User opens camera modal
2. @zxing/browser library scans QR in real-time
3. Decoded text sent to `/api/qr/decode-text`
4. Same processing as paste URL mode
5. Results displayed instantly

---

## 🛡️ Security Analysis

### Risk Banding Logic
```
if (domain in allowlist):
    return "safe"
elif (mlScore >= 0.8):
    return "dangerous"
elif (mlScore >= 0.5):
    return "suspicious"
else:
    return "safe"
```

### Allowlisted Domains
- google.com, amazon.com, facebook.com
- linkedin.com, instagram.com, twitter.com
- github.com, stackoverflow.com, reddit.com
- And 40+ more trusted domains

See `backend/src/config/safeDomains.txt` for full list.

---

## 📱 Supported QR Code Types

| Type | Example | Features |
|------|---------|----------|
| **HTTP/HTTPS** | `https://example.com` | ML threat analysis, allowlist checking |
| **UPI** | `upi://pay?pa=user@bank` | Payment fraud detection, VPA validation |
| **Phone** | `tel:+911234567890` | Number validation |
| **Email** | `mailto:user@example.com` | Email parsing |
| **WiFi** | `WIFI:T:WPA;S:MyNetwork;P:pass;;` | WiFi credential extraction |
| **SMS** | `SMSTO:+911234567890:Hello` | SMS parsing |
| **Geo** | `geo:37.7749,-122.4194` | Location coordinates |
| **Text** | Any plain text | Direct text display |

---

## 🐛 Known Issues & Solutions

### HEIF/HEIC Upload Error
**Problem**: iPhone photos (.HEIC format) fail to upload
```
heif: Error while loading plugin
```

**Solutions**:
1. Convert photos to JPG/PNG before upload
2. Use camera scan mode instead
3. Install Sharp HEIF plugin (optional):
   ```bash
   cd backend
   npm install sharp --ignore-scripts=false
   ```

### ML Service Not Starting
**Problem**: Port 8000 already in use

**Solution**:
```bash
lsof -ti:8000 | xargs kill -9
python3 -m uvicorn app:app --reload
```

---

## 🎨 UI Components

### Premium Components

**RiskBadge**
- Visual indicator: Safe/Suspicious/Dangerous
- Confidence percentage display
- Animated pulse effect
- Verified shield for allowlisted domains

**RiskMeter**
- Animated 0-100 score bar
- Color gradient (green → yellow → red)
- Threshold marker at 80
- Smooth transitions

**HistoryPanel**
- Last 10 scans with localStorage
- Risk badges + timestamps
- Click to reload scan
- Clear all option

**Toast Notifications**
- 4 types: success, error, info, warning
- Auto-dismiss (3 seconds)
- Slide-in animation

---

## 🔌 API Reference

### POST /api/qr/decode
Upload QR code image for analysis.

**Request**:
```
Content-Type: multipart/form-data
file: <image file>
```

**Response**:
```json
{
  "success": true,
  "decodedText": "https://example.com",
  "isUrl": true,
  "qrType": "http",
  "riskBand": "safe",
  "mlScore": 0.12,
  "mlLabel": "benign",
  "allowlistApplied": false,
  "reasons": ["Low ML risk score", "No suspicious patterns"],
  "hostname": "example.com"
}
```

### POST /api/qr/decode-text
Analyze decoded QR text or URL.

**Request**:
```json
{
  "decodedText": "https://example.com"
}
```

**Response**: Same as `/api/qr/decode`

---

## 📊 Testing

### Manual Testing Checklist
- ✅ Upload PNG/JPG QR code
- ✅ Paste URL and analyze
- ✅ Camera scan QR code
- ✅ Test UPI QR code
- ✅ Test network errors
- ✅ Verify history saves
- ✅ Test dark mode
- ✅ Mobile responsive

### Sample Test URLs
```bash
# Safe
https://www.google.com

# Suspicious (demo)
https://suspicious-site-example.com

# Dangerous (demo)
https://malicious-phishing-example.com
```

---

## 🚢 Deployment

### Production Checklist
1. Set environment variables
2. Build frontend: `npm run build`
3. Use PM2 or similar for process management
4. Set up NGINX reverse proxy
5. Enable HTTPS with SSL certificates
6. Configure CORS for production domain
7. Set up monitoring and logs

### Docker (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

---

## 📝 Development Notes

### Recent Changes (Feb 2026)
1. **Premium UI Redesign** - Complete UI overhaul with risk badges, meters, history
2. **ML Training** - Trained on 641K URLs with 98.36% accuracy
3. **QR Display Consistency** - Fixed camera scan to show same details as upload
4. **Paste URL Restoration** - Kept all 3 modes (upload, paste, camera)
5. **Emoji Removal** - Cleaner professional interface

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Dark mode throughout
- Mobile-first responsive
- WCAG accessibility standards

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is for educational and demonstration purposes.

---

## 🙋 Support

For issues or questions:
1. Check this README first
2. Review code comments
3. Check browser console for errors
4. Verify all services are running
5. Check CORS configuration

---

## 🎉 Acknowledgments

- **ML Dataset**: Sourced from public URL threat databases
- **Libraries**: Next.js, Express.js, FastAPI, scikit-learn, Sharp, jsQR, @zxing/browser
- **UI Inspiration**: Modern security products and premium web design

---

**Made with ❤️ for secure QR code scanning**
