"""
FastAPI ML Service for Malicious URL Detection
Loads pre-trained Random Forest model and TF-IDF vectorizer
Provides /predict endpoint for URL classification
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import joblib
import json
import re
import os
import sys
from typing import Literal
import logging

# Import shared tokenizer
try:
    from tokenizer import url_tokenizer
except ImportError:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from tokenizer import url_tokenizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Malicious URL Detector",
    description="ML-powered URL safety classification using Random Forest",
    version="1.0.0"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
vectorizer = None
model = None
model_version = None
training_config = None

# Constants
MAX_URL_LENGTH = 2048
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')


class PredictRequest(BaseModel):
    """Request model for prediction"""
    url: str = Field(..., min_length=1, max_length=MAX_URL_LENGTH)
    
    @validator('url')
    def validate_url(cls, v):
        if len(v) > MAX_URL_LENGTH:
            raise ValueError(f'URL length exceeds maximum of {MAX_URL_LENGTH} characters')
        if not v.strip():
            raise ValueError('URL cannot be empty')
        return v.strip()


class PredictResponse(BaseModel):
    """Response model for prediction"""
    label: Literal["benign", "malicious", "unknown"]
    score: float = Field(..., ge=0.0, le=1.0)
    model_version: str = "unknown"
    is_confident: bool = False  # True if score > 0.9 or < 0.1


class ErrorResponse(BaseModel):
    """Error response model"""
    error: dict


@app.on_event("startup")
async def load_models():
    """Load ML models and training config on startup"""
    global vectorizer, model, model_version, training_config
    
    try:
        logger.info("Loading ML models...")
        
        tfidf_path = os.path.join(MODEL_DIR, 'tfidf.joblib')
        rf_path = os.path.join(MODEL_DIR, 'rf.joblib')
        
        if not os.path.exists(tfidf_path):
            raise FileNotFoundError(f"TF-IDF model not found at {tfidf_path}")
        if not os.path.exists(rf_path):
            raise FileNotFoundError(f"Random Forest model not found at {rf_path}")
        
        vectorizer = joblib.load(tfidf_path)
        model = joblib.load(rf_path)
        
        # Load training config for model version
        config_path = os.path.join(MODEL_DIR, 'training_config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                training_config = json.load(f)
                model_version = training_config.get('model_version', 'unknown')
        else:
            model_version = 'unknown'
            training_config = {}
        
        logger.info("✅ Models loaded successfully!")
        logger.info(f"   Model version: {model_version}")
        logger.info(f"   TF-IDF features: {len(vectorizer.get_feature_names_out())}")
        logger.info(f"   Random Forest trees: {model.n_estimators}")
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {str(e)}")
        logger.error("Please run train_model.py first to generate model artifacts")
        raise


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Malicious URL Detector",
        "status": "running",
        "models_loaded": vectorizer is not None and model is not None
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    if vectorizer is None or model is None:
        raise HTTPException(
            status_code=503,
            detail="Models not loaded"
        )
    
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_version": model_version or "unknown",
        "vectorizer": "loaded",
        "model": "loaded",
        "n_estimators": model.n_estimators,
        "n_features": len(vectorizer.get_feature_names_out()),
        "recommended_threshold": training_config.get('recommended_threshold', 0.5) if training_config else 0.5,
        "tfidf_params": training_config.get('tfidf_params', {}) if training_config else {}
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Predict if URL is malicious or benign
    
    Returns:
        - label: "benign", "malicious", or "unknown"
        - score: probability of being malicious (0.0 to 1.0)
    """
    try:
        if vectorizer is None or model is None:
            logger.error("Models not loaded")
            raise HTTPException(
                status_code=503,
                detail={
                    "error": {
                        "code": "MODEL_NOT_LOADED",
                        "message": "ML models are not loaded"
                    }
                }
            )
        
        url = request.url
        logger.info(f"Predicting URL: {url[:100]}...")
        
        # Basic validation - check if it looks like a URL
        if not ('http://' in url.lower() or 'https://' in url.lower() or '.' in url):
            logger.warning(f"Invalid URL format: {url}")
            return PredictResponse(label="unknown", score=0.0)
        
        # Transform URL using TF-IDF
        url_tfidf = vectorizer.transform([url])
        
        # Get prediction and probability
        prediction = model.predict(url_tfidf)[0]
        probability = model.predict_proba(url_tfidf)[0]
        
        # probability[1] is the probability of class 1 (malicious)
        malicious_score = float(probability[1])
        label = "malicious" if prediction == 1 else "benign"
        
        # Determine confidence (far from decision boundary)
        is_confident = (malicious_score > 0.9) or (malicious_score < 0.1)
        
        logger.info(f"Prediction: {label} (score: {malicious_score:.4f}, confident: {is_confident})")
        
        return PredictResponse(
            label=label,
            score=malicious_score,
            model_version=model_version or "unknown",
            is_confident=is_confident
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "PREDICTION_ERROR",
                    "message": "Failed to process prediction"
                }
            }
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
