"""
Production ML Training Script for Safe-Scan Lite URL Detector
Trains TF-IDF + RandomForest on large malicious_phish.csv dataset (650k+ rows)
Features: Auto column detection, hyperparameter tuning, metrics tracking, model versioning
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (accuracy_score, classification_report,
               confusion_matrix, f1_score, precision_score,
               recall_score)
from sklearn.model_selection import GridSearchCV, StratifiedShuffleSplit, train_test_split

# Import shared tokenizer (critical for model persistence to work correctly)
try:
    from tokenizer import url_tokenizer
except ImportError:
    # Fallback for when running from a different directory
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from tokenizer import url_tokenizer


def auto_detect_columns(df: pd.DataFrame) -> Tuple[str, str]:
    """
    Auto-detect URL and label column names from the dataset.
    Returns: (url_column_name, label_column_name)
    """
    url_candidates = ['url', 'URL', 'Url', 'domain', 'link', 'website', 'uri']
    label_candidates = ['label', 'type', 'result', 'class', 'target', 'category']
    
    url_col = None
    label_col = None
    
    # Find URL column
    for candidate in url_candidates:
        if candidate in df.columns:
            url_col = candidate
            break
    
    # Find label column
    for candidate in label_candidates:
        if candidate in df.columns:
            label_col = candidate
            break
    
    if not url_col or not label_col:
        raise ValueError(
            f"Could not auto-detect columns. Available columns: {df.columns.tolist()}\\n"
            f"Expected URL column from: {url_candidates}\\n"
            f"Expected label column from: {label_candidates}"
        )
    
    print(f"✓ Auto-detected columns: URL='{url_col}', Label='{label_col}'")
    return url_col, label_col


def normalize_labels(df: pd.DataFrame, label_col: str) -> pd.DataFrame:
    """
    Normalize labels to binary: 'benign' or 'malicious'.
    Maps: 0/'benign'/'good'/'safe' -> 'benign'
          1/'malicious'/'bad'/'phishing'/'malware'/'defacement'/etc -> 'malicious'
    """
    benign_values = ['0', 'benign', 'good', 'safe', 'legitimate', '0.0']
    
    def map_label(label):
        label_str = str(label).strip().lower()
        if label_str in benign_values:
            return 'benign'
        else:
            return 'malicious'
    
    df['normalized_label'] = df[label_col].apply(map_label)
    
   # Print label distribution
    dist = df['normalized_label'].value_counts()
    print(f"\\n✓ Label distribution:")
    for label, count in dist.items():
        print(f"  - {label}: {count:,} ({count/len(df)*100:.1f}%)")
    
    return df


def load_and_preprocess(data_path: str, sample_size: int = None, brand_file: str = None) -> Tuple[pd.DataFrame, str, str]:
    """
    Load CSV, auto-detect columns, normalize labels, optionally augment with benign brands.
    If sample_size is set, use stratified sampling (for faster testing).
    """
    print(f"\\n📂 Loading dataset from: {data_path}")
    
    # Read CSV (efficient for large files)
    df = pd.read_csv(data_path, encoding='utf-8', low_memory=False)
    print(f"✓ Loaded {len(df):,} rows")
    
    # Auto-detect columns
    url_col, label_col = auto_detect_columns(df)
    
    # Remove duplicates BEFORE any processing
    before_dedup = len(df)
    df = df.drop_duplicates(subset=[url_col])
    print(f"✓ Removed {before_dedup - len(df):,} duplicates, {len(df):,} unique URLs remain")
    
    # Remove missing values and invalid URLs
    df = df[[url_col, label_col]].dropna()
    # Remove empty URLs
    df = df[df[url_col].str.strip().str.len() > 0]
    print(f"✓ Removed rows with missing/empty values, {len(df):,} rows remain")
    
    # Normalize labels
    df = normalize_labels(df, label_col)
    
    # BENIGN BRAND AUGMENTATION
    if brand_file and os.path.exists(brand_file):
        print(f"\\n🎯 Augmenting with benign brands from: {brand_file}")
        brands_df = pd.read_csv(brand_file, encoding='utf-8')
        # Detect columns in brand file
        brand_url_col = 'url' if 'url' in brands_df.columns else brands_df.columns[0]
        brand_label_col = 'label' if 'label' in brands_df.columns else brands_df.columns[1]
        
        # Normalize brand labels
        brands_df = brands_df[[brand_url_col, brand_label_col]].dropna()
        brands_df = normalize_labels(brands_df, brand_label_col)
        brands_df = brands_df[[brand_url_col, 'normalized_label']]
        brands_df.columns = [url_col, 'normalized_label']
        
        # Append brands to main dataset
        before_augment = len(df)
        df = pd.concat([df, brands_df], ignore_index=True)
        # Remove duplicates again (in case brands already exist)
        df = df.drop_duplicates(subset=[url_col])
        print(f"✓ Added {len(df) - before_augment:,} unique brand URLs")
    
    # Optional: stratified sampling for faster testing
    if sample_size and sample_size < len(df):
        print(f"\\n⚡ Using stratified sample of {sample_size:,} rows for faster training")
        splitter = StratifiedShuffleSplit(n_splits=1, train_size=sample_size, random_state=42)
        sample_idx, _ = next(splitter.split(df, df['normalized_label']))
        df = df.iloc[sample_idx].reset_index(drop=True)
        print(f"✓ Sampled {len(df):,} rows while preserving label distribution")
    
    return df, url_col, 'normalized_label'


def train_model(
    X_train, y_train, X_test, y_test,
    n_estimators: int = 400,
    tune_hyperparams: bool = False,
    use_char_ngrams: bool = True
) -> Tuple[TfidfVectorizer, RandomForestClassifier, Dict]:
    """
    Train TF-IDF vectorizer + RandomForest classifier.
    Optionally run GridSearchCV for hyperparameter tuning.
    Use char n-grams by default for better brand pattern recognition.
    """
    print(f"\\n🔬 Training models...")
    
    # 1. Train TF-IDF Vectorizer
    print("  1/2 Training TF-IDF vectorizer...")
    if use_char_ngrams:
        print("  📝 Using character n-grams (3-5) for better brand recognition")
        tfidf = TfidfVectorizer(
            analyzer='char_wb',  # Character n-grams with word boundaries
            ngram_range=(3, 5),  # Trigrams to 5-grams
            max_features=10000,
            lowercase=True,
            min_df=2
        )
    else:
        print("  📝 Using word tokenization (legacy mode)")
        tfidf = TfidfVectorizer(
            tokenizer=url_tokenizer,
            lowercase=True,
            max_features=10000,
            ngram_range=(1, 2),
            min_df=2
        )
    X_train_tfidf = tfidf.fit_transform(X_train)
    X_test_tfidf = tfidf.transform(X_test)
    print(f"  ✓ TF-IDF vocabulary size: {len(tfidf.vocabulary_):,} features")
    
    # 2. Train RandomForest
    print("  2/2 Training RandomForest classifier...")
    
    if tune_hyperparams:
        print("  ⚙️ Running hyperparameter tuning with GridSearchCV...")
        param_grid = {
            'n_estimators': [200, 400, 600],
            'max_depth': [None, 30, 60],
            'min_samples_split': [2, 5]
        }
        rf_base = RandomForestClassifier(
            class_weight='balanced',
            n_jobs=-1,
            random_state=42,
            oob_score=True,
            bootstrap=True
        )
        grid_search = GridSearchCV(
            rf_base,
            param_grid,
            cv=3,  # 3-fold CV
            scoring='f1',
            n_jobs=-1,
            verbose=1
        )
        grid_search.fit(X_train_tfidf, y_train)
        rf = grid_search.best_estimator_
        print(f"  ✓ Best parameters: {grid_search.best_params_}")
        print(f"  ✓ Best CV F1 score: {grid_search.best_score_:.4f}")
        best_params = grid_search.best_params_
    else:
        # Use specified parameters
        rf = RandomForestClassifier(
            n_estimators=n_estimators,
            class_weight='balanced',
            n_jobs=-1,
            random_state=42,
            oob_score=True,
            bootstrap=True,
            max_depth=None,
            min_samples_split=2
        )
        rf.fit(X_train_tfidf, y_train)
        best_params = {
            'n_estimators': n_estimators,
            'max_depth': None,
            'min_samples_split': 2
        }
        print(f"  ✓ Trained with n_estimators={n_estimators}")
    
    if hasattr(rf, 'oob_score_'):
        print(f"  ✓ OOB score (generalization estimate): {rf.oob_score_:.4f}")
    
    # 3. Evaluate on test set
    print("\\n📊 Evaluating on test set...")
    y_pred = rf.predict(X_test_tfidf)
    y_pred_proba = rf.predict_proba(X_test_tfidf)[:, 1]  # Probability of malicious
    
    # 4. Threshold Calibration - find best threshold for F1 score
    print("\\n⚖️ Calibrating optimal threshold...")
    from sklearn.metrics import precision_recall_curve
    precision_vals, recall_vals, thresholds = precision_recall_curve(
        y_test, y_pred_proba, pos_label='malicious'
    )
    # Calculate F1 for each threshold
    f1_scores = 2 * (precision_vals * recall_vals) / (precision_vals + recall_vals + 1e-10)
    best_threshold_idx = np.argmax(f1_scores)
    recommended_threshold = float(thresholds[best_threshold_idx]) if best_threshold_idx < len(thresholds) else 0.5
    best_f1 = f1_scores[best_threshold_idx]
    
    print(f"  ✓ Recommended threshold: {recommended_threshold:.4f} (F1: {best_f1:.4f})")
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred, pos_label='malicious'),
        'recall': recall_score(y_test, y_pred, pos_label='malicious'),
        'f1': f1_score(y_test, y_pred, pos_label='malicious'),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
        'oob_score': float(rf.oob_score_) if hasattr(rf, 'oob_score_') else None,
        'best_params': best_params,
        'recommended_threshold': recommended_threshold,
        'threshold_calibration': {
            'best_f1': float(best_f1),
            'default_threshold_f1': float(f1_scores[np.argmin(np.abs(thresholds - 0.5))]) if len(thresholds) > 0 else 0.0
        }
    }
    
    print(f"\\n  Accuracy:  {metrics['accuracy']:.4f}")
    print(f"  Precision: {metrics['precision']:.4f}")
    print(f"  Recall:    {metrics['recall']:.4f}")
    print(f"  F1 Score:  {metrics['f1']:.4f}")
    print(f"\\n  Confusion Matrix:")
    cm = np.array(metrics['confusion_matrix'])
    labels = ['benign', 'malicious']
    for i, label in enumerate(labels):
        print(f"    {label:10s}: {cm[i]}")
    
    print(f"\\n✓ Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['benign', 'malicious']))
    
    return tfidf, rf, metrics


def save_artifacts(
    tfidf, rf, metrics, config, output_dir: str
):
    """
    Save model artifacts, metrics, and training config.
    """
    print(f"\\n💾 Saving artifacts to: {output_dir}")
    os.makedirs(output_dir, exist_ok=True)
    
    # Save models
    tfidf_path = os.path.join(output_dir, 'tfidf.joblib')
    rf_path = os.path.join(output_dir, 'rf.joblib')
    joblib.dump(tfidf, tfidf_path)
    joblib.dump(rf, rf_path)
    print(f"  ✓ Saved: {tfidf_path}")
    print(f"  ✓ Saved: {rf_path}")
    
    # Save metrics
    metrics_path = os.path.join(output_dir, 'metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"  ✓ Saved: {metrics_path}")
    
    # Save training config
    config_path = os.path.join(output_dir, 'training_config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"  ✓ Saved: {config_path}")
    
    print(f"\\n✅ Training complete! Model version: {config['model_version']}")


def main():
    parser = argparse.ArgumentParser(
        description='Train Random Forest malicious URL detector'
    )
    parser.add_argument(
        '--data',
        type=str,
        default='./data/malicious_phish.csv',
        help='Path to training CSV file'
    )
    parser.add_argument(
        '--out',
        type=str,
        default='./artifacts',
        help='Output directory for model artifacts'
    )
    parser.add_argument(
        '--n_estimators',
        type=int,
        default=400,
        help='Number of trees in RandomForest (default: 400)'
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=None,
        help='Use stratified sample of N rows for faster training (default: use all data)'
    )
    parser.add_argument(
        '--tune',
        action='store_true',
        help='Enable hyperparameter tuning with GridSearchCV (slower but better results)'
    )
    parser.add_argument(
        '--test_size',
        type=float,
        default=0.2,
        help='Test set proportion (default: 0.2 = 20%%)'
    )
    parser.add_argument(
        '--brand_file',
        type=str,
        default='./data/benign_brands.csv',
        help='Path to benign brands CSV for augmentation (default: ./data/benign_brands.csv)'
    )
    parser.add_argument(
        '--no_char_ngrams',
        action='store_true',
        help='Use word tokenization instead of char n-grams (reduces accuracy)'
    )
    
    args = parser.parse_args()
    
    print("="*70)
    print(" Safe-Scan Lite - ML URL Detector Training Pipeline")
    print("="*70)
    
    # Load and preprocess data
    df, url_col, label_col = load_and_preprocess(
        args.data, 
        args.sample, 
        brand_file=args.brand_file if os.path.exists(args.brand_file or '') else None
    )
    
    # Split train/test
    print(f"\\n✂️ Splitting data: {int((1-args.test_size)*100)}% train, {int(args.test_size*100)}% test")
    X = df[url_col].values
    y = df[label_col].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=args.test_size,
        stratify=y,
        random_state=42
    )
    print(f"  ✓ Train: {len(X_train):,} samples")
    print(f"  ✓ Test:  {len(X_test):,} samples")
    
    # Train model
    tfidf, rf, metrics = train_model(
        X_train, y_train, X_test, y_test,
        n_estimators=args.n_estimators,
        tune_hyperparams=args.tune,
        use_char_ngrams=not args.no_char_ngrams
    )
    
    # Prepare training config
    model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
    config = {
        'model_version': model_version,
        'timestamp': datetime.now().isoformat(),
        'dataset_path': args.data,
        'dataset_size': len(df),
        'url_column': url_col,
        'label_column': label_col,
        'label_distribution': df[label_col].value_counts().to_dict(),
        'train_size': len(X_train),
        'test_size': len(X_test),
        'test_split': args.test_size,
        'sample_size': args.sample,
        'hyperparameter_tuning': args.tune,
        'tfidf_params': {
            'analyzer': 'char_wb' if not args.no_char_ngrams else 'word',
            'ngram_range': [3, 5] if not args.no_char_ngrams else [1, 2],
            'max_features': 10000,
            'min_df': 2
        },
        'rf_params': metrics['best_params'],
        'recommended_threshold': metrics['recommended_threshold'],
        'brand_augmentation': args.brand_file if os.path.exists(args.brand_file or '') else None
    }
    
    # Save artifacts
    save_artifacts(tfidf, rf, metrics, config, args.out)
    
    print(f"\\n{'='*70}")
    print(" 🎉 Training Complete!")
    print(f"{'='*70}\\n")


if __name__ == '__main__':
    main()
