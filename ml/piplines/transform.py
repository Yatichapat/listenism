"""Transform raw interactions into model-ready data."""

from __future__ import annotations

import pandas as pd

from piplines.recommender import build_interaction_matrix, clean_interactions


def prepare_training_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Return the canonical interaction frame used by the recommender."""

    return clean_interactions(frame)


def build_user_item_matrix(frame: pd.DataFrame) -> pd.DataFrame:
    """Pivot cleaned interactions into a user-by-song matrix."""

    return build_interaction_matrix(frame)


def build_item_user_matrix(frame: pd.DataFrame) -> pd.DataFrame:
    """Pivot cleaned interactions into an item-by-user matrix for item-based CF."""

    return build_interaction_matrix(frame).T

