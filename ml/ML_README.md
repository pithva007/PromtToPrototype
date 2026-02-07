# ML Service - Malicious URL Detector

AI-powered URL safety classification using Random Forest and TF-IDF features.

## 🎯 Overview

This ML service provides real-time malicious URL detection for the Safe-Scan QR code scanner. It uses a Random Forest classifier trained on URL text features extracted via TF-IDF vectorization.

## 📊 Model Details

- **Algorithm**: Random Forest Classifier
- **Features**: TF-IDF with custom URL tokenizer
- **Training Data**: URLs labeled as benign/malicious
- **Classification**: Binary (benign vs malicious)
- **Default Threshold**: 0.60 (configurable in backend)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_model.py
```

This will:
- Load `sample_data.csv`
- Train Random Forest with TF-IDF features
- Display metrics (accuracy, precision, recall, F1)
- Save models to `artifacts/tfidf.joblib` and `artifacts/rf.joblib`

**Optional arguments:**
```bash
# Use custom dataset
python train_model.py path/to/your/data.csv

# Specify number of trees
python train_model.py sample_data.csv 100
```

### 3. Start the FastAPI Service

```bash
# Development (with auto-reload)
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Production
python app.py
```

The service will start at `http://localhost:8000`

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "vectorizer": "loaded",
  "model": "loaded",
  "n_estimators": 50,
  "n_features": 5000
}
```

### Predict URL Safety
```bash
POST /predict
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "label": "benign",
  "score": 0.15
}
```

- `label`: "benign", "malicious", or "unknown"
- `score`: Probability of being malicious (0.0 to 1.0)

## 📈 Training Metrics

After training, you'll see:
- **Accuracy**: Overall correctness
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1 Score**: Harmonic mean of precision and recall
- **Confusion Matrix**: Detailed classification breakdown
- **Feature Importance**: Top predictive URL tokens

## 📝 Dataset Format

Training data should be a CSV file with two columns:

```csv
url,label
https://www.google.com,benign
http://phishing-site.tk/login,malicious
https://github.com/user/repo,benign
http://malware.download/virus.exe,malicious
```

**Label values:**
- `benign`: Safe URL
- `malicious`: Dangerous URL

## 🔧 Custom Tokenizer

The service uses a custom URL tokenizer that splits on:
- Forward slashes `/`
- Colons `:`
- Dots `.`
- Question marks `?`
- Equals signs `=`
- Ampersands `&`
- Hyphens `-`
- Underscores `_`
- Hash symbols `#`
- Percent signs `%`

Example:
```
https://example.com/login?user=test
→ ["https", "example", "com", "login", "user", "test"]
```

## 🧪 Testing

### Test Prediction Endpoint

```bash
# Test benign URL
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.google.com"}'

# Test malicious URL
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"http://phishing-login.tk/verify"}'

# Test invalid input
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"url":"not-a-url"}'
```

## 🔐 Security Features

- **No Network Calls**: ML service NEVER fetches or opens URLs
- **Text-Only Analysis**: All classification based on URL string patterns
- **Input Validation**: Max URL length (2048 chars)
- **Error Handling**: Graceful degradation if models not loaded

## 📊 Performance Optimization

- **Lazy Loading**: Models loaded once on startup
- **Fast Inference**: Typical prediction < 10ms
- **Memory Efficient**: Uses joblib for model persistence
- **Scalable**: Stateless service, easy to deploy multiple instances

## 🐛 Troubleshooting

### Models Not Found Error

```
FileNotFoundError: TF-IDF model not found
```

**Solution**: Run training first
```bash
python train_model.py
```

### Poor Accuracy

- **Add more training data**: Aim for 100+ samples per class
- **Increase n_estimators**: `python train_model.py sample_data.csv 100`
- **Balance dataset**: Equal benign/malicious samples

### Service Won't Start

- **Check port 8000**: Make sure nothing else is running
- **Install dependencies**: `pip install -r requirements.txt`
- **Check Python version**: Requires Python 3.10+

## 📦 Deployment

### Docker (Optional)

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t ml-url-detector .
docker run -p 8000:8000 ml-url-detector
```

## 📚 References

This implementation is based on the paper:
**"Securing healthcare systems - a random forest approach to malicious URL detection"**

Key concepts applied:
- TF-IDF feature extraction for URL text
- Random Forest ensemble learning
- Balanced class weights for imbalanced data
- Custom tokenization for URL structure

---

**Built for Safe-Scan Lite** 🔒
