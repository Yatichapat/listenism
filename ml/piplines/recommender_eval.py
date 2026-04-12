"""Evaluation helpers for recommendation quality metrics."""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd

from piplines.recommender_infer import recommend_from_model
from piplines.recommender_preprocess import build_model_matrix, train_knn_model


def _average_precision_at_k(actual: set[int], predicted: Iterable[int], k: int) -> float:
    hits = 0
    score = 0.0
    for rank, item_id in enumerate(list(predicted)[:k], start=1):
        if item_id in actual:
            hits += 1
            score += hits / rank
    return score / min(len(actual), k) if actual else 0.0


def _build_artifacts(train_frame: pd.DataFrame, model_kind: str) -> dict[str, object]:
    user_matrix = build_model_matrix(train_frame, model_kind="user")
    model_matrix = build_model_matrix(train_frame, model_kind=model_kind)
    model = train_knn_model(model_matrix)
    return {
        "model": model,
        "matrix": model_matrix,
        "user_matrix": user_matrix,
        "model_kind": model_kind,
    }


def _evaluate_single_user(
    user_id: int,
    user_test: pd.DataFrame,
    artifacts: dict[str, object],
    k: int,
) -> tuple[float, float, float] | None:
    relevant = set(user_test["song_id"].astype(int))
    if not relevant:
        return None

    predictions = recommend_from_model(user_id, artifacts, n=k)
    predicted_ids = [int(item["song_id"]) for item in predictions]
    hits = len(set(predicted_ids[:k]) & relevant)
    precision = hits / k
    recall = hits / len(relevant)
    map_score = _average_precision_at_k(relevant, predicted_ids, k)
    return precision, recall, map_score


def _aggregate_metrics(metrics: list[tuple[float, float, float]]) -> dict[str, float]:
    if not metrics:
        return {"precision_at_k": 0.0, "recall_at_k": 0.0, "map_at_k": 0.0}

    precision_scores = [metric[0] for metric in metrics]
    recall_scores = [metric[1] for metric in metrics]
    map_scores = [metric[2] for metric in metrics]
    return {
        "precision_at_k": float(np.mean(precision_scores)),
        "recall_at_k": float(np.mean(recall_scores)),
        "map_at_k": float(np.mean(map_scores)),
    }


def evaluate_recommendations(
    train_frame: pd.DataFrame,
    test_frame: pd.DataFrame,
    model_kind: str = "user",
    k: int = 5,
) -> dict[str, float]:
    artifacts = _build_artifacts(train_frame, model_kind)
    metrics: list[tuple[float, float, float]] = []

    for user_id, user_test in test_frame.groupby("user_id"):
        score = _evaluate_single_user(int(user_id), user_test, artifacts, k)
        if score is not None:
            metrics.append(score)

    return _aggregate_metrics(metrics)
