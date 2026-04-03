"""Load raw interaction data for the Listenism recommender."""

from __future__ import annotations

from pathlib import Path
import os

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

USER_ID_ALIASES = ("user_id", "userId", "listener_id")
SONG_ID_ALIASES = ("song_id", "songId", "track_id")
INTERACTION_ALIASES = ("interaction", "weight", "value", "play_count", "liked")
ACTION_ALIASES = ("action", "event_type", "interaction_type")
OPTIONAL_SONG_METADATA = ("genre", "artist_id", "duration_seconds")

ACTION_WEIGHTS = {
	"like": 1.0,
	"liked": 1.0,
	"play": 0.7,
	"listen": 0.7,
	"stream": 0.7,
	"skip": 0.1,
	"dislike": 0.0,
	"save": 1.2,
}

DATABASE_URL = os.getenv("DATABASE_URL")


def _read_source(path: Path) -> pd.DataFrame:
	suffix = path.suffix.lower()
	if suffix in {".csv", ".tsv"}:
		return pd.read_csv(path, sep="\t" if suffix == ".tsv" else ",")
	if suffix in {".parquet", ".pq"}:
		return pd.read_parquet(path)
	if suffix in {".json", ".ndjson"}:
		return pd.read_json(path, lines=suffix == ".ndjson")
	raise ValueError(f"Unsupported data format: {path.suffix}")


def _first_existing_column(frame: pd.DataFrame, aliases: tuple[str, ...]) -> str | None:
	for name in aliases:
		if name in frame.columns:
			return name
	return None


def _build_interaction_signal(frame: pd.DataFrame) -> pd.Series:
	interaction_column = _first_existing_column(frame, INTERACTION_ALIASES)
	if interaction_column is not None:
		values = pd.to_numeric(frame[interaction_column], errors="coerce").fillna(0.0)
		if interaction_column == "liked":
			return values.astype(bool).astype(float)
		if interaction_column == "play_count":
			return values.clip(lower=0).astype(float)
		return values.astype(float)

	action_column = _first_existing_column(frame, ACTION_ALIASES)
	if action_column is not None:
		normalized_actions = frame[action_column].astype(str).str.lower().str.strip()
		return normalized_actions.map(ACTION_WEIGHTS).fillna(0.5).astype(float)

	return pd.Series(1.0, index=frame.index)


def _normalize_interactions(frame: pd.DataFrame) -> pd.DataFrame:
	user_column = _first_existing_column(frame, USER_ID_ALIASES)
	song_column = _first_existing_column(frame, SONG_ID_ALIASES)

	if user_column is None or song_column is None:
		raise ValueError("Raw data must contain user and song identifier columns")

	normalized = frame[[user_column, song_column]].copy()
	normalized.columns = ["user_id", "song_id"]
	normalized["interaction"] = _build_interaction_signal(frame).astype(float)

	for column_name in OPTIONAL_SONG_METADATA:
		if column_name in frame.columns and column_name not in normalized.columns:
			normalized[column_name] = frame[column_name]

	return normalized


def _load_from_database(database_url: str) -> pd.DataFrame:
	engine = create_engine(database_url)
	queries = [
		text(
			"""
			SELECT
				l.user_id,
				l.song_id,
				1.0 AS interaction,
				s.genre,
				s.artist_id,
				s.duration_seconds
			FROM likes AS l
			JOIN songs AS s ON s.id = l.song_id
			"""
		),
		text(
			"""
			SELECT
				c.user_id,
				c.song_id,
				0.5 AS interaction,
				s.genre,
				s.artist_id,
				s.duration_seconds
			FROM comments AS c
			JOIN songs AS s ON s.id = c.song_id
			"""
		),
		text(
			"""
			SELECT
				f.follower_id AS user_id,
				s.id AS song_id,
				0.25 AS interaction,
				s.genre,
				s.artist_id,
				s.duration_seconds
			FROM follows AS f
			JOIN songs AS s ON s.artist_id = f.artist_id
			"""
		),
	]

	frames: list[pd.DataFrame] = []
	with engine.connect() as connection:
		for query in queries:
			frame = pd.read_sql_query(query, connection)
			if not frame.empty:
				frames.append(frame)

	if not frames:
		return pd.DataFrame(columns=["user_id", "song_id", "interaction", *OPTIONAL_SONG_METADATA])

	combined = pd.concat(frames, ignore_index=True)
	combined["user_id"] = combined["user_id"].astype(int)
	combined["song_id"] = combined["song_id"].astype(int)
	combined["interaction"] = combined["interaction"].astype(float)
	combined = (
		combined.groupby(["user_id", "song_id"], as_index=False)
		.agg(
			{
				"interaction": "sum",
				"genre": "first",
				"artist_id": "first",
				"duration_seconds": "first",
			}
		)
		.sort_values(["user_id", "song_id"])
		.reset_index(drop=True)
	)
	return combined


def _build_demo_data() -> pd.DataFrame:
	rows = []
	for user_id in range(1, 11):
		for song_id in range(1, 21):
			if (user_id + song_id) % 4 == 0:
				rows.append({"user_id": user_id, "song_id": song_id, "interaction": 1.0})
	return pd.DataFrame(rows)


def load_raw_interactions(source_path: str | Path | None = None) -> pd.DataFrame:
	"""Load raw user-song interactions from disk or fall back to demo data."""

	candidate = source_path or os.getenv("RAW_DATA_PATH") or os.getenv("DATA_PATH")
	if candidate:
		path = Path(candidate)
		if path.exists():
			return _normalize_interactions(_read_source(path))

	if DATABASE_URL:
		try:
			return _load_from_database(DATABASE_URL)
		except SQLAlchemyError:
			pass

	return _build_demo_data()

