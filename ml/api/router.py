"""FastAPI router for ML recommendation service."""

from pathlib import Path
import os
import pickle

from fastapi import APIRouter, Query

from piplines.recommender import recommend_from_model

router = APIRouter()

MODEL_PATH = Path(os.getenv("MODEL_PATH", "models/cf_model.pkl"))


def load_model():
    if not MODEL_PATH.exists():
        return {}

    try:
        with MODEL_PATH.open("rb") as f:
            obj = pickle.load(f)
    except Exception:
        return {}

    return obj if isinstance(obj, dict) else {}


@router.get("/recommend")
def recommend(user_id: int = Query(..., description="User ID"), n: int = Query(5, ge=1, le=50)):
    try:
        artifacts = load_model()
        return recommend_from_model(user_id, artifacts, n=n)
    except Exception:
        return []
