"""Revenant ML service — TabPFN ghost-risk inference + embeddings.

TABPFN_MODE=api  → Prior Labs hosted inference (PRIORLABS_API_KEY)
TABPFN_MODE=local → local tabpfn weights (CPU ok for small batches)
TABPFN_MODE=off  → service refuses scoring, web falls back to heuristic
"""
import os
import time
import json
import logging
from pathlib import Path

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

from .features import FEATURE_KEYS

log = logging.getLogger("revenant-ml")
logging.basicConfig(level=logging.INFO)

MODE = os.environ.get("TABPFN_MODE", "off")
MODEL_PATH = Path(__file__).parent / "model" / "ghost-tabpfn.joblib"
EMB_MODEL = os.environ.get("EMB_MODEL", "google/embeddinggemma-300m")

app = FastAPI(title="revenant-ml")

_clf = None
_scaler = None
_embedder = None


def load_model():
    global _clf
    if _clf is not None:
        return _clf
    if not MODEL_PATH.exists():
        return None
    import joblib
    _clf = joblib.load(MODEL_PATH)
    return _clf


def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMB_MODEL)
    return _embedder


class ScoreRequest(BaseModel):
    features: list[float]


@app.get("/health")
def health():
    return {
        "ok": True,
        "mode": MODE,
        "model_loaded": load_model() is not None,
        "features": len(FEATURE_KEYS),
    }


@app.post("/score")
def score(req: ScoreRequest):
    """Return calibrated P(abandoned within 12 months)."""
    if len(req.features) != len(FEATURES := FEATURE_KEYS):
        return {"error": f"expected {len(FEATURE_KEYS)} features"}, 422
    # hard signals override the model — archived/deprecated are facts
    X = np.array([req.features], dtype=float)
    archived = req.features[FEATURE_KEYS.index("archived")]
    deprecated = req.features[FEATURE_KEYS.index("deprecated")]

    if MODE == "off":
        return {"error": "TABPFN_MODE=off"}, 503

    clf = load_model()
    if clf is None:
        return {"error": "model not trained — run python -m ml.evaluate first"}, 503

    if MODE == "api":
        p = prior_labs_predict(X)
    else:
        p = float(clf.predict_proba(X)[0, 1])
    if archived or deprecated:
        p = max(p, 0.9)
    return {"p_abandoned": round(min(max(p, 0.0), 1.0), 4), "mode": MODE}


def prior_labs_predict(X: np.ndarray) -> float:
    """Prior Labs hosted TabPFN inference."""
    key = os.environ["PRIORLABS_API_KEY"]
    import httpx
    r = httpx.post(
        os.environ.get("PRIORLABS_API_URL", "https://api.priorlabs.ai/v1/predict"),
        headers={"authorization": f"Bearer {key}"},
        json={"features": X.tolist(), "task": "classification", "thinking": os.environ.get("TABPFN_THINKING", "0") == "1"},
        timeout=30,
    )
    r.raise_for_status()
    return float(r.json()["probabilities"][0][1])


class EmbedRequest(BaseModel):
    texts: list[str]


@app.post("/embed")
def embed(req: EmbedRequest):
    e = get_embedder()
    vecs = e.encode(req.texts[:64], normalize_embeddings=True)
    return {"vectors": vecs.tolist(), "model": EMB_MODEL}


class TinkerSample(BaseModel):
    prompt: str
    max_tokens: int = 300


@app.post("/tinker")
def tinker_sample(req: TinkerSample):
    """Serve the fine-tuned epitaph LoRA via Tinker's sampling client."""
    key = os.environ.get("TINKER_API_KEY")
    weights = Path(__file__).parent / "tinker" / "epitaph-lora"
    if not key or not weights.exists():
        return {"error": "TINKER_API_KEY unset or weights not downloaded"}, 503
    try:
        import tinker  # noqa: F401
    except ImportError:
        return {"error": "tinker SDK not installed"}, 503
    from .tinker.serve import sample
    return {"text": sample(req.prompt, str(weights), req.max_tokens)}


@app.get("/metrics")
def metrics():
    m = Path(__file__).parent.parent / "data" / "eval-results.json"
    if m.exists():
        return json.loads(m.read_text())
    return {"error": "no eval results yet"}
