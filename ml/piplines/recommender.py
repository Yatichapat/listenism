"""Compatibility facade that re-exports recommender helpers."""

from piplines.recommender_eval import evaluate_recommendations
from piplines.recommender_infer import Recommendation, recommend_from_model, recommend_popular_songs
from piplines.recommender_preprocess import (
    SONG_METADATA_COLUMNS,
    build_interaction_matrix,
    build_model_matrix,
    clean_interactions,
    extract_song_metadata,
    split_leave_one_out,
    train_knn_model,
    weight_interactions,
)

__all__ = [
    "SONG_METADATA_COLUMNS",
    "Recommendation",
    "build_interaction_matrix",
    "build_model_matrix",
    "clean_interactions",
    "evaluate_recommendations",
    "extract_song_metadata",
    "recommend_from_model",
    "recommend_popular_songs",
    "split_leave_one_out",
    "train_knn_model",
    "weight_interactions",
]