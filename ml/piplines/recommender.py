"""Recommendation and evaluation helpers for the Listenism ML service."""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import normalize

SONG_METADATA_COLUMNS = ("genre", "artist_id", "duration_seconds")


def clean_interactions(frame: pd.DataFrame) -> pd.DataFrame:
    required_columns = {"user_id", "song_id"}
    missing_columns = required_columns - set(frame.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"Missing required columns: {missing}")

    columns = ["user_id", "song_id"]
    if "interaction" in frame.columns:
        columns.append("interaction")

    cleaned = frame.loc[:, columns].copy()
    if "interaction" not in cleaned.columns:
        cleaned["interaction"] = 1.0

    cleaned["user_id"] = cleaned["user_id"].astype(int)
    cleaned["song_id"] = cleaned["song_id"].astype(int)
    cleaned["interaction"] = cleaned["interaction"].fillna(0).astype(float)
    cleaned = cleaned[cleaned["interaction"] > 0].copy()
    return cleaned


def weight_interactions(frame: pd.DataFrame) -> pd.DataFrame:
    weighted = clean_interactions(frame)
    weighted["interaction"] = np.log1p(weighted["interaction"].clip(lower=0))
    return weighted


def extract_song_metadata(frame: pd.DataFrame) -> dict[int, dict[str, object]]:
    metadata_columns = [column for column in SONG_METADATA_COLUMNS if column in frame.columns]
    if not metadata_columns:
        return {}

    metadata_frame = frame.loc[:, ["song_id", *metadata_columns]].copy()
    metadata_frame["song_id"] = metadata_frame["song_id"].astype(int)
    metadata_frame = metadata_frame.drop_duplicates(subset=["song_id"], keep="first")

    metadata: dict[int, dict[str, object]] = {}
    for record in metadata_frame.to_dict(orient="records"):
        song_id = int(record.pop("song_id"))
        metadata[song_id] = record
    return metadata


def build_interaction_matrix(frame: pd.DataFrame) -> pd.DataFrame:
    weighted = weight_interactions(frame)
    matrix = weighted.pivot_table(
        index="user_id",
        columns="song_id",
        values="interaction",
        aggfunc="sum",
        fill_value=0,
    )
    matrix = matrix.sort_index().sort_index(axis=1)
    matrix.index.name = "user_id"
    matrix.columns.name = "song_id"
    return matrix


def split_leave_one_out(frame: pd.DataFrame, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    cleaned = clean_interactions(frame)
    train_rows: list[pd.DataFrame] = []
    test_rows: list[pd.DataFrame] = []
    rng = np.random.default_rng(seed)

    for _, user_rows in cleaned.groupby("user_id", sort=False):
        user_rows = user_rows.sort_values(["interaction", "song_id"], ascending=[False, True])
        if len(user_rows) < 2:
            train_rows.append(user_rows)
            continue

        holdout_index = int(rng.integers(0, len(user_rows)))
        holdout = user_rows.iloc[[holdout_index]]
        keep = user_rows.drop(user_rows.index[holdout_index])
        train_rows.append(keep)
        test_rows.append(holdout)

    train_frame = pd.concat(train_rows, ignore_index=True) if train_rows else cleaned.iloc[0:0].copy()
    test_frame = pd.concat(test_rows, ignore_index=True) if test_rows else cleaned.iloc[0:0].copy()
    return train_frame, test_frame


def build_model_matrix(frame: pd.DataFrame, model_kind: str = "user") -> pd.DataFrame:
    matrix = build_interaction_matrix(frame)
    if model_kind == "item":
        item_matrix = matrix.T
        return pd.DataFrame(
            normalize(item_matrix.values, norm="l2", axis=1),
            index=item_matrix.index,
            columns=item_matrix.columns,
        )

    return pd.DataFrame(
        normalize(matrix.values, norm="l2", axis=1),
        index=matrix.index,
        columns=matrix.columns,
    )


def train_knn_model(matrix: pd.DataFrame) -> NearestNeighbors:
    model = NearestNeighbors(metric="cosine", algorithm="brute")
    model.fit(matrix.values)
    return model


def _candidate_score_from_neighbors(
    matrix: pd.DataFrame,
    model: NearestNeighbors,
    row_vector: np.ndarray,
    excluded_items: set[int],
    n_neighbors: int,
) -> dict[int, float]:
    distances, indices = model.kneighbors(row_vector, n_neighbors=min(n_neighbors + 1, len(matrix)))
    scores: dict[int, float] = {}
    for distance, neighbor_index in zip(distances[0], indices[0], strict=False):
        if neighbor_index >= len(matrix.index):
            continue
        similarity = max(0.0, 1.0 - float(distance))
        neighbor_vector = matrix.iloc[neighbor_index]
        for item_id, value in neighbor_vector[neighbor_vector > 0].items():
            if int(item_id) in excluded_items:
                continue
            scores[int(item_id)] = scores.get(int(item_id), 0.0) + similarity * float(value)
    return scores


def _content_boost(song_id: int, seen_items: set[int], song_metadata: dict[int, dict[str, object]] | None) -> float:
    if not song_metadata or song_id not in song_metadata or not seen_items:
        return 0.0

    candidate = song_metadata.get(song_id, {})
    boost = 0.0
    comparisons = 0

    for seen_song_id in seen_items:
        seen_metadata = song_metadata.get(seen_song_id, {})
        if not seen_metadata:
            continue
        comparisons += 1

        candidate_genre = candidate.get("genre")
        seen_genre = seen_metadata.get("genre")
        if candidate_genre and seen_genre and candidate_genre == seen_genre:
            boost += 1.0

        candidate_artist = candidate.get("artist_id")
        seen_artist = seen_metadata.get("artist_id")
        if candidate_artist is not None and seen_artist is not None and candidate_artist == seen_artist:
            boost += 1.0

        candidate_duration = candidate.get("duration_seconds")
        seen_duration = seen_metadata.get("duration_seconds")
        if candidate_duration is not None and seen_duration is not None:
            try:
                candidate_duration_value = float(candidate_duration)
                seen_duration_value = float(seen_duration)
            except (TypeError, ValueError):
                continue
            duration_gap = abs(candidate_duration_value - seen_duration_value)
            boost += max(0.0, 1.0 - min(duration_gap / 300.0, 1.0))

    return boost / comparisons if comparisons else 0.0


def recommend_from_model(
    user_id: int,
    artifacts: dict[str, object],
    n: int = 5,
) -> list[dict[str, float | int]]:
    model = artifacts.get("model")
    matrix = artifacts.get("matrix")
    model_kind = str(artifacts.get("model_kind", "user"))

    if not isinstance(matrix, pd.DataFrame) or model is None:
        return []

    if model_kind == "item":
        return _recommend_item_based(user_id, artifacts, n=n)
    return _recommend_user_based(user_id, artifacts, n=n)


def _recommend_user_based(user_id: int, artifacts: dict[str, object], n: int) -> list[dict[str, float | int]]:
    model = artifacts["model"]
    matrix = artifacts["matrix"]
    song_metadata = artifacts.get("song_metadata")
    assert isinstance(model, NearestNeighbors)
    assert isinstance(matrix, pd.DataFrame)

    if user_id not in matrix.index:
        return recommend_popular_songs(artifacts, n=n)

    row_vector = matrix.loc[[user_id]].values
    seen_items = set(matrix.columns[matrix.loc[user_id] > 0].astype(int))
    scores = _candidate_score_from_neighbors(matrix, model, row_vector, seen_items, n_neighbors=max(n, 10))
    if isinstance(song_metadata, dict) and song_metadata:
        for song_id in list(scores):
            scores[song_id] += 0.2 * _content_boost(song_id, seen_items, song_metadata)

    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:n]
    if ranked:
        return [{"song_id": song_id, "score": float(score)} for song_id, score in ranked]
    return recommend_popular_songs(artifacts, n=n)


def _recommend_item_based(user_id: int, artifacts: dict[str, object], n: int) -> list[dict[str, float | int]]:
    model = artifacts["model"]
    matrix = artifacts["matrix"]
    user_matrix = artifacts.get("user_matrix")
    song_metadata = artifacts.get("song_metadata")
    assert isinstance(model, NearestNeighbors)
    assert isinstance(matrix, pd.DataFrame)
    assert isinstance(user_matrix, pd.DataFrame)

    if user_id not in user_matrix.index:
        return recommend_popular_songs(artifacts, n=n)

    user_vector = user_matrix.loc[user_id]
    seen_items = set(user_vector[user_vector > 0].index.astype(int))
    candidate_scores: dict[int, float] = {}

    item_space = matrix
    for item_id in seen_items:
        if item_id not in item_space.index:
            continue
        item_vector = item_space.loc[[item_id]].values
        distances, indices = model.kneighbors(item_vector, n_neighbors=min(n + 1, len(item_space)))
        for distance, neighbor_index in zip(distances[0], indices[0], strict=False):
            neighbor_item = int(item_space.index[neighbor_index])
            if neighbor_item in seen_items:
                continue
            similarity = max(0.0, 1.0 - float(distance))
            candidate_scores[neighbor_item] = candidate_scores.get(neighbor_item, 0.0) + similarity

    if isinstance(song_metadata, dict) and song_metadata:
        for song_id in list(candidate_scores):
            candidate_scores[song_id] += 0.2 * _content_boost(song_id, seen_items, song_metadata)

    ranked = sorted(candidate_scores.items(), key=lambda item: (-item[1], item[0]))[:n]
    if ranked:
        return [{"song_id": song_id, "score": float(score)} for song_id, score in ranked]
    return recommend_popular_songs(artifacts, n=n)


def recommend_popular_songs(artifacts: dict[str, object], n: int = 5) -> list[dict[str, float | int]]:
    matrix = artifacts.get("matrix")
    user_matrix = artifacts.get("user_matrix")
    model_kind = str(artifacts.get("model_kind", "user"))

    if not isinstance(matrix, pd.DataFrame):
        return []

    if model_kind == "item":
        source_matrix = user_matrix if isinstance(user_matrix, pd.DataFrame) else matrix.T
        popularity = source_matrix.sum(axis=0).sort_values(ascending=False)
    else:
        source_matrix = matrix
        popularity = source_matrix.sum(axis=0).sort_values(ascending=False)

    recommendations = [
        {"song_id": int(song_id), "score": float(score)}
        for song_id, score in popularity.head(n).items()
    ]
    return recommendations


def _average_precision_at_k(actual: set[int], predicted: Iterable[int], k: int) -> float:
    hits = 0
    score = 0.0
    for rank, item_id in enumerate(list(predicted)[:k], start=1):
        if item_id in actual:
            hits += 1
            score += hits / rank
    return score / min(len(actual), k) if actual else 0.0


def evaluate_recommendations(
    train_frame: pd.DataFrame,
    test_frame: pd.DataFrame,
    model_kind: str = "user",
    k: int = 5,
) -> dict[str, float]:
    user_matrix = build_model_matrix(train_frame, model_kind="user")
    model_matrix = build_model_matrix(train_frame, model_kind=model_kind)
    model = train_knn_model(model_matrix)
    artifacts = {
        "model": model,
        "matrix": model_matrix,
        "user_matrix": user_matrix,
        "model_kind": model_kind,
    }

    precision_scores: list[float] = []
    recall_scores: list[float] = []
    average_precision_scores: list[float] = []

    for user_id, user_test in test_frame.groupby("user_id"):
        relevant = set(user_test["song_id"].astype(int))
        if not relevant:
            continue

        predictions = recommend_from_model(int(user_id), artifacts, n=k)
        predicted_ids = [int(item["song_id"]) for item in predictions]
        hits = len(set(predicted_ids[:k]) & relevant)
        precision_scores.append(hits / k)
        recall_scores.append(hits / len(relevant))
        average_precision_scores.append(_average_precision_at_k(relevant, predicted_ids, k))

    if not precision_scores:
        return {"precision_at_k": 0.0, "recall_at_k": 0.0, "map_at_k": 0.0}

    return {
        "precision_at_k": float(np.mean(precision_scores)),
        "recall_at_k": float(np.mean(recall_scores)),
        "map_at_k": float(np.mean(average_precision_scores)),
    }