from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.song import Song


class MusicRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_songs(self) -> list[Song]:
        return list(self.db.scalars(select(Song).order_by(Song.created_at.desc())))

    def create_song(
        self, title: str, genre: str | None, artist_id: int, file_key: str | None = None
    ) -> Song:
        song = Song(title=title, genre=genre, artist_id=artist_id, file_key=file_key)
        self.db.add(song)
        self.db.commit()
        self.db.refresh(song)
        return song
