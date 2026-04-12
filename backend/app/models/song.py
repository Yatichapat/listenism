from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


class Song(Base):
    __tablename__ = "songs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    genre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)  # S3/MinIO object key
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    artist_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    album_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("albums.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    artist: Mapped["User"] = relationship("User", back_populates="songs")  # noqa: F821
    album: Mapped["Album | None"] = relationship("Album", back_populates="songs")  # noqa: F821
    playlist_entries: Mapped[list["PlaylistSong"]] = relationship("PlaylistSong", back_populates="song", cascade="all, delete-orphan")  # noqa: F821
    likes: Mapped[list["Like"]] = relationship("Like", back_populates="song", cascade="all, delete-orphan")  # noqa: F821
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="song", cascade="all, delete-orphan")  # noqa: F821
