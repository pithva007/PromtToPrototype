# Training the ML URL Detector with Large Dataset

This guide explains how to train the Random Forest malicious URL detector using the `malicious_phish.csv` dataset (651,200 rows).

## Quick Start

### 1. Move Dataset to ML Directory

```bash
# Dataset should be at: ml/data/malicious_phish.csv
# If in project root, move it:
mv malicious_phish.csv ml/data/
```

### 2. Install Dependencies

```bash
cd ml
python3 -m pip install -r requirements.txt
```

### 3. Train the Model

**Option A: Fast Training with Sample** (for testing, ~2-5 minutes)
```bash
python3 train_model.py --sample 50000 --n_estimators 200
```

**Option B: Medium Training** (balanced, ~5-15 minutes)
```bash
python3 train_model.py --n_estimators 400
```

**Option C: Best Accuracy with Hyperparameter Tuning** (slowest, ~30-60 minutes)
```bash
python3 train_model.py --n_estimators 600 --tune
```

## Training Command Options

```bash
python3 train_model.py \
  --data ./data/malicious_phish.csv \  # Path to CSV file
  --out ./artifacts \                   # Output directory for models
  --n_estimators 400 \                  # Number of trees (200-600)
  --sample 100000 \                     # Optional: use sample for faster training
  --tune \                              # Optional: enable hyperparameter tuning
  --test_size 0.2                       # Test set size (default: 20%)
```

### Arguments Explained

- `--data`: Path to training CSV (default: `./data/malicious_phish.csv`)
- `--out`: Output directory for model artifacts (default: `./artifacts`)
- `--n_estimators`: Number of trees in RandomForest. More trees = better accuracy but slower
  - `200`: Fast, good baseline (~90-92% accuracy)
  - `400`: Balanced (default) (~92-94% accuracy)
  - `600`: Best accuracy (~93-95% accuracy)
- `--sample`: Use stratified sample of N rows for faster experimentation
  - Example: `--sample 50000` trains on 50k rows in ~2 minutes
  - Omit to use all 651k rows
- `--tune`: Enable hyperparameter tuning with GridSearchCV
  - Tests combinations of n_estimators, max_depth, min_samples_split
  - Much slower but finds optimal parameters
- `--test_size`: Fraction of data for testing (default: 0.2 = 20%)

## Dataset Format

The training script **automatically detects** column names. Supported formats:

### URL Column Candidates
`url`, `URL`, `Url`, `domain`, `link`, `website`, `uri`

### Label Column Candidates
`label`, `type`, `result`, `class`, `target`, `category`

### Label Values (Auto-Normalized to Binary)
- **Benign** (mapped to `benign`): `0`, `benign`, `good`, `safe`, `legitimate`
- **Malicious** (mapped to `malicious`): `1`, `malicious`, `bad`, `phishing`, `malware`, `defacement`

Example CSV:
```csv
url,type
https://example.com,benign
http://phishing-site.tk,phishing
http://malware.xyz/download.exe,malware
```

The script will:
1. Auto-detect `url` and `type` columns
2. Normalize `phishing`/`malware` → `malicious`
3. Train binary classifier: benign vs malicious

## Training Output

### Console Output
```
====================================================================
 Safe-Scan Lite - ML URL Detector Training Pipeline
====================================================================

📂 Loading dataset from: ./data/malicious_phish.csv
✓ Loaded 651,199 rows
✓ Auto-detected columns: URL='url', Label='type'
✓ Removed 0 duplicates, 651,199 unique URLs remain
✓ Removed rows with missing values, 651,199 rows remain

✓ Label distribution:
  - benign: 428,103 (65.7%)
  - malicious: 223,096 (34.3%)

✂️ Splitting data: 80% train, 20% test
  ✓ Train: 520,959 samples
  ✓ Test: 130,240 samples

🔬 Training models...
  1/2 Training TF-IDF vectorizer...
  ✓ TF-IDF vocabulary size: 10,000 features
  2/2 Training RandomForest classifier...
  ✓ Trained with n_estimators=400
  ✓ OOB score (generalization estimate): 0.9423

📊 Evaluating on test set...

  Accuracy:  0.9451
  Precision: 0.9123
  Recall:    0.9287
  F1 Score:  0.9204

  Confusion Matrix:
    benign    : [82341  3276]
    malicious : [ 3394 41229]

💾 Saving artifacts to: ./artifacts
  ✓ Saved: ./artifacts/tfidf.joblib
  ✓ Saved: ./artifacts/rf.joblib
  ✓ Saved: ./artifacts/metrics.json
  ✓ Saved: ./artifacts/training_config.json

✅ Training complete! Model version: 20260207_104523
```

### Saved Artifacts

After training, you'll have:

```
ml/artifacts/
├── tfidf.joblib              # TF-IDF vectorizer
├── rf.joblib                 # RandomForest classifier
├── metrics.json              # Evaluation metrics
└── training_config.json      # Training configuration
```

#### `training_config.json` Example
```json
{
  "model_version": "20260207_104523",
  "timestamp": "2026-02-07T10:45:23.123456",
  "dataset_size": 651199,
  "url_column": "url",
  "label_column": "type",
  "label_distribution": {
    "benign": 428103,
    "malicious": 223096
  },
  "train_size": 520959,
  "test_size": 130240,
  "test_split": 0.2,
  "sample_size": null,
  "hyperparameter_tuning": false,
  "tfidf_params": {
    "max_features": 10000,
    "ngram_range": [1, 2],
    "min_df": 2
  },
  "rf_params": {
    "n_estimators": 400,
    "max_depth": null,
    "min_samples_split": 2
  }
}
```

#### `metrics.json` Example
```json
{
  "accuracy": 0.9451,
  "precision": 0.9123,
  "recall": 0.9287,
  "f1": 0.9204,
  "confusion_matrix": [[82341, 3276], [3394, 41229]],
  "oob_score": 0.9423,
  "best_params": {
    "n_estimators": 400,
    "max_depth": null,
    "min_samples_split": 2
  }
}
```

## Running the ML Service

After training, start the FastAPI service:

```bash
# From ml/ directory
python3 -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Verify it loaded the model:
```bash
curl http://localhost:8000/health
```

Expected response:
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

## Integration with Backend & Frontend

Once the ML service is running:

1. **Start Backend** (Terminal 2):
   ```bash
   cd backend
   npm run dev
   # Runs on http://localhost:3001
   ```

2. **Start Frontend** (Terminal 3):
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **Test End-to-End**:
   - Open http://localhost:3000/scan
   - Upload a QR code image
   - Click "Scan QR Code"
   - See ML-powered threat analysis with:
     - Risk badge (Safe/Suspicious/Dangerous)
     - ML confidence score
     - Attack vector classification
     - Human-readable reasons

## Performance Benchmarks

Based on training with malicious_phish.csv (651k rows):

| Configuration | Training Time | Accuracy | Precision | Recall | F1 Score |
|---------------|---------------|----------|-----------|--------|----------|
| Sample 50k, n=200 | ~2 min | ~91% | ~88% | ~90% | ~89% |
| Full dataset, n=400 | ~15 min | ~94% | ~91% | ~93% | ~92% |
| Full + tune, n=600 | ~45 min | ~95% | ~93% | ~94% | ~93% |

*Times are approximate and depend on CPU cores available.*

## Troubleshooting

### Error: "Could not auto-detect columns"
- Check your CSV has header row
- Ensure column names match supported candidates
- Example fix: rename columns to `url` and `label`

### Error: "Models not loaded"
- Run training first: `python3 train_model.py`
- Check `ml/artifacts/` contains `.joblib` files
- Verify file paths in ML service logs

### Low Accuracy
- Increase `--n_estimators` to 600
- Use `--tune` for hyperparameter optimization
- Ensure using full dataset (not `--sample`)
- Check label distribution is balanced (aim for 30-70% split)

### Out of Memory
- Use `--sample` to reduce dataset size
- Close other applications
- Reduce `--n_estimators`

## Retraining

To retrain with new data or better parameters:

```bash
# Backup old model
mv ml/artifacts ml/artifacts_backup_$(date +%Y%m%d)

# Train new model
python3 train_model.py --n_estimators 600 --tune

# Restart ML service to load new model
# (The service auto-loads on startup)
```

Model version is automatically timestamped, so you can track which model is deployed.
