"""Recommendation inference logic for user/item KNN models."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors

Recommendation = dict[str, float | int]


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
        positive_items = neighbor_vector[neighbor_vector > 0]
        for item_id, value in positive_items.items():
            item = int(item_id)
            if item in excluded_items:
                continue
            scores[item] = scores.get(item, 0.0) + similarity * float(value)

    return scores


def _extract_user_artifacts(
    artifacts: dict[str, object],
) -> tuple[NearestNeighbors, pd.DataFrame, dict[int, dict[str, object]] | None] | None:
    model = artifacts.get("model")
    matrix = artifacts.get("matrix")
    metadata = artifacts.get("song_metadata")

    if not isinstance(model, NearestNeighbors) or not isinstance(matrix, pd.DataFrame):
        return None
    if metadata is not None and not isinstance(metadata, dict):
        metadata = None
    return model, matrix, metadata


def _extract_item_artifacts(
    artifacts: dict[str, object],
) -> tuple[NearestNeighbors, pd.DataFrame, pd.DataFrame, dict[int, dict[str, object]] | None] | None:
    model = artifacts.get("model")
    matrix = artifacts.get("matrix")
    user_matrix = artifacts.get("user_matrix")
    metadata = artifacts.get("song_metadata")

    if not isinstance(model, NearestNeighbors):
        return None
    if not isinstance(matrix, pd.DataFrame) or not isinstance(user_matrix, pd.DataFrame):
        return None
    if metadata is not None and not isinstance(metadata, dict):
        metadata = None
    return model, matrix, user_matrix, metadata


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


def _fallback(artifacts: dict[str, object], n: int) -> list[Recommendation]:
    return recommend_genre_fallback_songs(artifacts, n=n)


def _get_seen_items(matrix: pd.DataFrame, user_id: int) -> set[int]:
    return set(matrix.columns[matrix.loc[user_id] > 0].astype(int))


def _apply_content_boosts(
    scores: dict[int, float],
    seen_items: set[int],
    metadata: dict[int, dict[str, object]] | None,
) -> dict[int, float]:
    if not metadata:
        return scores

    for song_id in list(scores):
        scores[song_id] += 0.2 * _content_boost(song_id, seen_items, metadata)
    return scores


def _rank_or_fallback(
    scores: dict[int, float],
    artifacts: dict[str, object],
    n: int,
) -> list[Recommendation]:
    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:n]
    if not ranked:
        return _fallback(artifacts, n)
    return [{"song_id": song_id, "score": float(score)} for song_id, score in ranked]


def _score_user_neighbors(
    model: NearestNeighbors,
    matrix: pd.DataFrame,
    user_id: int,
    seen_items: set[int],
    n: int,
) -> dict[int, float]:
    row_vector = matrix.loc[[user_id]].values
    return _candidate_score_from_neighbors(matrix, model, row_vector, seen_items, n_neighbors=max(n, 10))


def _score_item_neighbors(
    model: NearestNeighbors,
    item_matrix: pd.DataFrame,
    seen_items: set[int],
    n: int,
) -> dict[int, float]:
    scores: dict[int, float] = {}
    for item_id in seen_items:
        if item_id not in item_matrix.index:
            continue
        item_vector = item_matrix.loc[[item_id]].values
        distances, indices = model.kneighbors(item_vector, n_neighbors=min(n + 1, len(item_matrix)))
        for distance, neighbor_index in zip(distances[0], indices[0], strict=False):
            neighbor_item = int(item_matrix.index[neighbor_index])
            if neighbor_item in seen_items:
                continue
            similarity = max(0.0, 1.0 - float(distance))
            scores[neighbor_item] = scores.get(neighbor_item, 0.0) + similarity
    return scores


def recommend_from_model(
    user_id: int,
    artifacts: dict[str, object],
    n: int = 5,
) -> list[Recommendation]:
    extracted = _extract_user_artifacts(artifacts)
    model_kind = str(artifacts.get("model_kind", "user"))

    if extracted is None:
        return []

    if model_kind == "item":
        return _recommend_item_based(user_id, artifacts, n=n)
    return _recommend_user_based(user_id, artifacts, n=n)


def _recommend_user_based(user_id: int, artifacts: dict[str, object], n: int) -> list[Recommendation]:
    extracted = _extract_user_artifacts(artifacts)
    if extracted is None:
        return []
    model, matrix, song_metadata = extracted

    if user_id not in matrix.index:
        return _fallback(artifacts, n)

    seen_items = _get_seen_items(matrix, user_id)
    scores = _score_user_neighbors(model, matrix, user_id, seen_items, n)
    boosted_scores = _apply_content_boosts(scores, seen_items, song_metadata)
    return _rank_or_fallback(boosted_scores, artifacts, n)


def _recommend_item_based(user_id: int, artifacts: dict[str, object], n: int) -> list[Recommendation]:
    extracted = _extract_item_artifacts(artifacts)
    if extracted is None:
        return []
    model, item_matrix, user_matrix, song_metadata = extracted

    if user_id not in user_matrix.index:
        return _fallback(artifacts, n)

    user_vector = user_matrix.loc[user_id]
    seen_items = set(user_vector[user_vector > 0].index.astype(int))
    candidate_scores = _score_item_neighbors(model, item_matrix, seen_items, n)
    boosted_scores = _apply_content_boosts(candidate_scores, seen_items, song_metadata)
    return _rank_or_fallback(boosted_scores, artifacts, n)


def recommend_popular_songs(artifacts: dict[str, object], n: int = 5) -> list[Recommendation]:
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

    return [
        {"song_id": int(song_id), "score": float(score)}
        for song_id, score in popularity.head(n).items()
    ]


def recommend_genre_fallback_songs(artifacts: dict[str, object], n: int = 5) -> list[Recommendation]:
    matrix = artifacts.get("matrix")
    metadata = artifacts.get("song_metadata")
    if not isinstance(matrix, pd.DataFrame) or not isinstance(metadata, dict):
        return recommend_popular_songs(artifacts, n=n)

    popularity = matrix.sum(axis=0)
    genre_scores: dict[str, float] = {}
    for song_id, base_score in popularity.items():
        meta = metadata.get(int(song_id), {})
        genre = meta.get("genre")
        if not isinstance(genre, str) or not genre.strip():
            continue
        normalized_genre = genre.strip().lower()
        genre_scores[normalized_genre] = genre_scores.get(normalized_genre, 0.0) + float(base_score)

    if not genre_scores:
        return recommend_popular_songs(artifacts, n=n)

    ranked_genres = [genre for genre, _ in sorted(genre_scores.items(), key=lambda item: item[1], reverse=True)]
    ranked_songs: list[Recommendation] = []
    used_song_ids: set[int] = set()

    for genre in ranked_genres:
        matching = [
            (int(song_id), float(score))
            for song_id, score in popularity.items()
            if isinstance(metadata.get(int(song_id), {}).get("genre"), str)
            and metadata[int(song_id)]["genre"].strip().lower() == genre
        ]
        matching.sort(key=lambda item: item[1], reverse=True)
        for song_id, score in matching:
            if song_id in used_song_ids:
                continue
            ranked_songs.append({"song_id": song_id, "score": score})
            used_song_ids.add(song_id)
            if len(ranked_songs) >= n:
                return ranked_songs

    if len(ranked_songs) < n:
        popular = recommend_popular_songs(artifacts, n=n)
        for item in popular:
            song_id = int(item["song_id"])
            if song_id in used_song_ids:
                continue
            ranked_songs.append(item)
            used_song_ids.add(song_id)
            if len(ranked_songs) >= n:
                break

    return ranked_songs[:n]
