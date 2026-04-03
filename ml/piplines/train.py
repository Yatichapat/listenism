"""Training entrypoint for the Listenism recommender."""

from __future__ import annotations

from pathlib import Path
import os
import pickle
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from piplines.ingest import load_raw_interactions
from piplines.recommender import build_model_matrix, evaluate_recommendations, extract_song_metadata, split_leave_one_out, train_knn_model

RAW_DATA_PATH = os.getenv("RAW_DATA_PATH", os.getenv("DATA_PATH", "data/user_song_interactions.csv"))
MODEL_PATH = os.getenv("MODEL_PATH", "models/cf_model.pkl")
MODEL_KIND = os.getenv("MODEL_KIND", "user").lower().strip()
EVALUATE_MODEL = os.getenv("EVALUATE_MODEL", "1") != "0"
EVALUATION_K = int(os.getenv("EVALUATION_K", "5"))


def load_data():
    return load_raw_interactions(RAW_DATA_PATH)


def train_model():
    raw_interactions = load_data()
    if raw_interactions.empty:
        raise ValueError("No interactions available to train the recommender")

    train_frame, test_frame = split_leave_one_out(raw_interactions)
    user_matrix = build_model_matrix(train_frame, model_kind="user")
    model_matrix = build_model_matrix(train_frame, model_kind=MODEL_KIND)
    model = train_knn_model(model_matrix)
    song_metadata = extract_song_metadata(train_frame)

    metrics = None
    if EVALUATE_MODEL and not test_frame.empty:
        metrics = evaluate_recommendations(train_frame, test_frame, model_kind=MODEL_KIND, k=EVALUATION_K)

    artifacts = {
        "model": model,
        "matrix": model_matrix,
        "user_matrix": user_matrix,
        "song_metadata": song_metadata,
        "model_kind": MODEL_KIND,
        "metrics": metrics,
    }

    model_path = Path(MODEL_PATH)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as f:
        pickle.dump(artifacts, f)

    print(f"Model trained and saved to {MODEL_PATH}")
    if metrics is not None:
        print(f"Evaluation metrics: {metrics}")


if __name__ == "__main__":
    train_model()
