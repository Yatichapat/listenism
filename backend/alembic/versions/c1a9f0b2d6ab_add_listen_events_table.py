"""add listen events table

Revision ID: c1a9f0b2d6ab
Revises: 7fd4f5e9e9c1
Create Date: 2026-04-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a9f0b2d6ab"
down_revision: Union[str, Sequence[str], None] = "7fd4f5e9e9c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "listen_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listen_events_user_id", "listen_events", ["user_id"], unique=False)
    op.create_index("ix_listen_events_song_id", "listen_events", ["song_id"], unique=False)
    op.create_index("ix_listen_events_created_at", "listen_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_listen_events_created_at", table_name="listen_events")
    op.drop_index("ix_listen_events_song_id", table_name="listen_events")
    op.drop_index("ix_listen_events_user_id", table_name="listen_events")
    op.drop_table("listen_events")
