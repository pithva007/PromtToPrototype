# False-Positive Mitigation - Verification Guide

This guide helps you verify that the false-positive mitigation system is working correctly.

## Prerequisites

1. **Benign brands dataset created**: `ml/data/benign_brands.csv`
2. **Model retrained** with char n-grams and benign brand augmentation
3. **Backend .env updated** with new environment variables
4. **All three services running**: ML service, Backend, Frontend

---

## Step 1: Train Model with Benign Brands

```bash
cd ml

# Train model with char n-grams (default) and benign brand augmentation
python3 train_model.py --n_estimators 400

# Expected output:
# 🎯 Augmenting with benign brands from: ./data/benign_brands.csv
# ✓ Added 20 unique brand URLs
# 📝 Using character n-grams (3-5) for better brand recognition
# ⚖️ Calibrating optimal threshold...
# ✓ Recommended threshold: 0.XXXX (F1: 0.XXXX)
```

**What this does:**
- Uses char n-grams (3-5) instead of word tokens → better brand pattern recognition
- Adds 20 legitimate brand URLs to training data → teaches model these are safe
- Calibrates optimal threshold for F1 score → saves recommended_threshold in config

---

## Step 2: Update Backend Environment

```bash
cd ../backend

# Add to .env (or create from .env.example):
echo "ML_THRESHOLD=0.80" >> .env
echo "SAFE_OVERRIDE_MAX=0.95" >> .env
echo "SAFE_DOMAINS=instagram.com,linkedin.com,codeforces.com,github.com,google.com,youtube.com" >> .env
```

**What this does:**
- `ML_THRESHOLD=0.80`: Raises threshold from 0.60 → reduces false positives
- `SAFE_OVERRIDE_MAX=0.95`: Allows allowlist override for scores < 0.95
- `SAFE_DOMAINS`: Trusted domains that get allowlist treatment

---

## Step 3: Start All Services

### Terminal 1: ML Service
```bash
cd ml
python3 -m uvicorn app:app --reload

# Expected output:
# ✅ Models loaded successfully!
#    Model version: 20260207_HHMMSS
#    TF-IDF features: 10000
#    Recommended threshold: 0.XXXX
```

### Terminal 2: Backend
```bash
cd backend
npm run dev

# Should auto-reload and pick up new .env variables
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

---

## Step 4: Test Legitimate Brand URLs → SAFE/SUSPICIOUS

Create QR codes for these URLs and scan them:

### Test Case 1: Instagram (Should be SAFE)
- URL: `https://www.instagram.com/`
- **Expected Result:**
  - ✅ Risk Band: **SAFE** (even if ML score is somewhat elevated)
  - ✅ Allowlist notice: "Trusted domain override applied: instagram.com"
  - ✅ Hostname: `www.instagram.com`
  - ✅ Reason: "Known trusted domain detected: instagram.com"

### Test Case 2: LinkedIn (Should be SAFE)
- URL: `https://www.linkedin.com/`
- **Expected Result:**
  - ✅ Risk Band: **SAFE**
  - ✅ Allowlist notice shown
  - ✅ Hostname: `www.linkedin.com`

### Test Case 3: Codeforces (Should be SAFE)
- URL: `https://codeforces.com/`
- **Expected Result:**
  - ✅ Risk Band: **SAFE**
  - ✅ Allowlist notice shown
  - ✅ Hostname: `codeforces.com`

### Test Case 4: Subdomain (Should be SAFE)
- URL: `https://jobs.linkedin.com/`
- **Expected Result:**
  - ✅ Risk Band: **SAFE** (allowlist uses `endsWith` matching)
  - ✅ Allowlist notice: "Trusted domain override applied: linkedin.com"

---

## Step 5: Test Phishing URLs → DANGEROUS

### Test Case 5: Instagram Phishing (Should be DANGEROUS)
- URL: `http://instagram-verify.xyz/login`
- **Expected Result:**
  - ❌ Risk Band: **DANGEROUS**
  - ❌ No allowlist override (not exact match for instagram.com)
  - ⚠️ Reasons:
    - "ML model detected suspicious patterns"
    - "URL contains login/verification keywords"
    - "URL uses a high-risk top-level domain (.xyz)"

### Test Case 6: PayPal Phishing (Should be DANGEROUS)
- URL: `http://paypal-secure-login.tk/verify`
- **Expected Result:**
  - ❌ Risk Band: **DANGEROUS**
  - ⚠️ High-risk TLD: `.tk`
  - ⚠️ Phishing keywords: "login", "verify"

### Test Case 7: Generic Malware (Should be DANGEROUS)
- URL: `http://malicious-download.top/setup.exe`
- **Expected Result:**
  - ❌ Risk Band: **DANGEROUS**
  - ⚠️ Attack vector: Malware Distribution
  - ⚠️ High-risk TLD: `.top`

---

## Step 6: Test Edge Cases

### Test Case 8: High Score But Allowlisted
- URL: `https://instagram.com/` with ML score = 0.92
- **Expected Result:**
  - ✅ Risk Band: **SUSPICIOUS** (score < 0.95, so allowlist applies)
  - ✅ Allowlist notice shown
  - ✅ Downgraded from DANGEROUS to SUSPICIOUS

### Test Case 9: Very High Score - No Override
- URL: `https://instagram.com/` with ML score = 0.97
- **Expected Result:**
  - ❌ Risk Band: **DANGEROUS** (exceeds SAFE_OVERRIDE_MAX=0.95)
  - ❌ No allowlist override
  - ⚠️ Treated as dangerous despite being allowlisted

---

## Expected Metrics from ML Service

Check `/health` endpoint:
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "20260207_HHMMSS",
  "n_estimators": 400,
  "n_features": 10000,
  "recommended_threshold": 0.7xxx,  // Should be around 0.70-0.85
  "tfidf_params": {
    "analyzer": "char_wb",
    "ngram_range": [3, 5],
    "max_features": 10000
  }
}
```

---

## Troubleshooting

### Issue: Legitimate URLs still marked dangerous
**Cause:** Model not retrained or brand file not loaded
**Fix:**
```bash
cd ml
# Verify benign_brands.csv exists
ls -lh data/benign_brands.csv

# Retrain model
python3 train_model.py --n_estimators 400

# Restart ML service
```

### Issue: Allowlist override not working
**Cause:** Backend .env not updated or services not restarted
**Fix:**
```bash
cd backend
# Check .env has SAFE_DOMAINS
cat .env | grep SAFE_DOMAINS

# Restart backend
npm run dev
```

### Issue: Hostname not showing in frontend
**Cause:** Backend not returning hostname field
**Fix:** Check backend response in browser DevTools Network tab

---

## Success Criteria ✅

- [ ] Instagram/LinkedIn/Codeforces → SAFE with allowlist notice
- [ ] Phishing URLs → DANGEROUS with specific reasons
- [ ] Hostname displayed in frontend results
- [ ] Risk band from backend (not recomputed in frontend)
- [ ] Model uses char n-grams (check /health endpoint)
- [ ] Recommended threshold saved in training_config.json
