"""Data preparation and model-building utilities for recommendations."""

from __future__ import annotations

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
