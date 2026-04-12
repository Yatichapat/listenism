"""add playlists tables

Revision ID: d4d82a7ec9f1
Revises: c1a9f0b2d6ab
Create Date: 2026-04-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4d82a7ec9f1"
down_revision: Union[str, Sequence[str], None] = "c1a9f0b2d6ab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "playlists",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_playlists_user_id", "playlists", ["user_id"], unique=False)

    op.create_table(
        "playlist_songs",
        sa.Column("playlist_id", sa.Integer(), nullable=False),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("playlist_id", "song_id"),
        sa.UniqueConstraint("playlist_id", "position", name="uq_playlist_song_position"),
    )
    op.create_index("ix_playlist_songs_song_id", "playlist_songs", ["song_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_playlist_songs_song_id", table_name="playlist_songs")
    op.drop_table("playlist_songs")
    op.drop_index("ix_playlists_user_id", table_name="playlists")
    op.drop_table("playlists")
