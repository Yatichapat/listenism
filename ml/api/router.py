"""
FastAPI router for ML recommendation service.
"""
from pathlib import Path
import os
import pickle

import numpy as np
from fastapi import APIRouter, Query

router = APIRouter()

MODEL_PATH = Path(os.getenv("MODEL_PATH", "models/cf_model.pkl"))


def load_model():
    if not MODEL_PATH.exists():
        return None, None

    try:
        with MODEL_PATH.open("rb") as f:
            obj = pickle.load(f)
    except Exception:
        return None, None

    return obj.get("model"), obj.get("matrix")


def recommend_for_user(user_id: int, n: int = 5):
    model, matrix = load_model()
    if model is None or matrix is None:
        return []
    if user_id not in matrix.index:
        return []
    user_vec = matrix.loc[[user_id]].values
    dists, indices = model.kneighbors(user_vec, n_neighbors=n+1)
    # Skip the first neighbor (the user itself)
    rec_indices = indices[0][1:]
    rec_users = matrix.index[rec_indices]
    # Aggregate songs liked by similar users but not by the target user
    user_songs = set(np.where(matrix.loc[user_id] > 0)[0])
    rec_songs = set()
    for uid in rec_users:
        rec_songs.update(np.where(matrix.loc[uid] > 0)[0])
    new_songs = rec_songs - user_songs
    song_names = [matrix.columns[i] for i in new_songs]
    return [{"song_id": name, "score": 1.0} for name in song_names]


@router.get("/recommend")
def recommend(user_id: int = Query(..., description="User ID")):
    try:
        items = recommend_for_user(user_id)
        return items
    except Exception:
        return []
