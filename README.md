# Safe-Scan Lite 🔐

A production-grade QR code scanning web application with secure image upload and decoding capabilities.

## 📋 Features

- **Secure QR Decoding**: Safely decode QR codes from PNG, JPG, and WebP images
- **🤖 AI-Powered URL Detection**: Random Forest ML model detects malicious URLs
- **🎯 Threat Classification**: Identifies phishing, malware, payment scams, and redirects
- **📊 Risk Scoring**: Real-time threat assessment with confidence levels
- **Modern UI**: Beautiful, responsive interface built with Next.js 14 and Tailwind CSS
- **Real-time Validation**: Client and server-side file validation
- **Smart URL Detection**: Automatically detects and normalizes URLs
- **Rate Limiting**: Built-in protection against abuse
- **Type-Safe**: Full TypeScript implementation
- **Mobile-Friendly**: Optimized for all screen sizes
- **Dark Mode**: Automatic theme switching

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React 18**

### Backend
- **Express** + TypeScript
- **jsQR** - QR code decoding
- **sharp** - Image processing
- **multer** - File uploads
- **axios** - ML service client
- **express-rate-limit** - API protection
- **CORS** - Cross-origin security

### ML Service
- **Python 3.10+** + FastAPI
- **scikit-learn** - Random Forest classifier
- **TF-IDF** - Feature extraction
- **pandas** - Data processing
- **joblib** - Model persistence

## 📁 Project Structure

```
PtoP/                      # Project root
├── ml/                    # Python ML Service
│   ├── app.py            # FastAPI server
│   ├── train_model.py    # Model training
│   ├── sample_data.csv   # Training data
│   ├── requirements.txt
│   └── artifacts/        # Trained models
│
├── backend/              # Express API
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── qr.routes.ts
│   │   │   └── analyzeUrl.routes.ts
│   │   ├── controllers/
│   │   │   ├── qr.controller.ts
│   │   │   └── analyzeUrl.controller.ts
│   │   ├── middleware/
│   │   │   ├── upload.middleware.ts
│   │   │   └── rateLimiter.middleware.ts
│   │   └── utils/
│   │       ├── qrDecoder.ts
│   │       ├── validators.ts
│   │       └── mlClient.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/             # Next.js 14 App
│   ├── src/
│   │   └── app/
│   │       ├── scan/     # QR scan page
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       └── globals.css
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.local
│
├── README.md
├── SETUP.md              # Complete setup guide
└── CURL_EXAMPLES.md      # API testing examples
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- Git

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+

### Installation

1. **Navigate to the project folder**
```bash
cd /Users/khushpithva/Documents/PtoP
```

2. **Install ML Service Dependencies**
```bash
cd ml
pip install -r requirements.txt
```

3. **Train the ML Model (REQUIRED)**
```bash
python train_model.py
```

This creates the trained model files in `ml/artifacts/`

4. **Install Backend Dependencies**
```bash
cd ../backend
npm install
```

5. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### Environment Setup

#### Backend (.env)
The `.env` file is already created with default values:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env.local)
The `.env.local` file is already created:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running the Application

**Option 1: Run both servers in separate terminals**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**Option 2: Run from project root**

Terminal 1:
```bash
cd /Users/khushpithva/Documents/PtoP/backend && npm run dev
```

Terminal 2:
```bash
cd /Users/khushpithva/Documents/PtoP/frontend && npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Scan Page**: http://localhost:3000/scan

## 🧪 Testing with cURL

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Decode QR Code (with a sample image)
```bash
# Create a test QR code image first or use an existing one
curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@/path/to/your/qr-code.png"
```

### 3. Test Invalid File Type
```bash
curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@/path/to/document.pdf"
```

**Expected Response (Success):**
```json
{
  "success": true,
  "decodedText": "https://example.com",
  "isUrl": true,
  "normalizedUrl": "https://example.com",
  "error": null
}
```

**Expected Response (Error - No QR Found):**
```json
{
  "success": false,
  "decodedText": null,
  "isUrl": false,
  "normalizedUrl": null,
  "error": {
    "code": "QR_NOT_FOUND",
    "message": "No QR code found in image"
  }
}
```

## 📖 API Documentation

### POST `/api/qr/decode`

Decode a QR code from an uploaded image.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field name: `file`
- Accepted types: PNG, JPG, WebP
- Max size: 5MB

**Response:**
```typescript
{
  success: boolean;
  decodedText: string | null;
  isUrl: boolean;
  normalizedUrl: string | null;
  error: {
    code: string;
    message: string;
  } | null;
}
```

**Error Codes:**
- `NO_FILE_UPLOADED` - No file in request
- `INVALID_FILE_TYPE` - File is not PNG/JPG/WebP
- `FILE_TOO_LARGE` - File exceeds 5MB
- `QR_NOT_FOUND` - No QR code detected in image
- `DECODE_FAILED` - Failed to decode QR code
- `INTERNAL_ERROR` - Server error
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 🔒 Security Features

1. **File Validation**
   - MIME type checking (PNG, JPG, WebP only)
   - File size limits (5MB max)
   - Memory-based storage (no disk writes)

2. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Prevents API abuse

3. **CORS Protection**
   - Configured for frontend origin only
   - Prevents unauthorized cross-origin requests

4. **Image Processing**
   - Automatic downsizing for large images
   - Prevents memory exhaustion attacks

5. **Safe URL Handling**
   - URLs are not automatically opened
   - User must explicitly click to visit
   - Normalized URLs with protocol validation

## 🎨 Frontend Features

### Scan Page (`/scan`)

- **Upload Interface**
  - Drag-and-drop zone (styled)
  - File type validation
  - File size validation
  - Preview of selected file

- **Loading States**
  - Animated spinner during decode
  - Disabled buttons during processing

- **Result Display**
  - Success message with decoded text
  - URL detection and clickable links
  - Copy to clipboard functionality
  - Error messages with helpful text

- **Responsive Design**
  - Mobile-first approach
  - Dark mode support
  - Touch-friendly buttons

## 🏗️ Building for Production

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

## 📝 Scripts Reference

### Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build
- `npm run type-check` - Check TypeScript types

### Frontend Scripts
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify all dependencies are installed: `npm install`
- Check `.env` file exists with correct values

### Frontend can't connect to backend
- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS settings in backend

### QR code not decoding
- Ensure image contains a valid QR code
- Check image is not corrupted
- Verify file is PNG, JPG, or WebP
- Try a higher resolution image

### Rate limit errors
- Wait 15 minutes before retrying
- Adjust `RATE_LIMIT_MAX_REQUESTS` in backend `.env` if needed

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using Next.js and Express**
