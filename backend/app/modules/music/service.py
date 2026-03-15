from sqlalchemy.orm import Session

from app.modules.music.repository import MusicRepository
from app.modules.music.schemas import SongCreateRequest, SongListResponse, SongResponse


class MusicService:
    def __init__(self, db: Session) -> None:
        self.repo = MusicRepository(db)

    def list_songs(self) -> SongListResponse:
        songs = self.repo.list_songs()
        items = [
            SongResponse(
                id=s.id,
                title=s.title,
                artist_name=s.artist.display_name if s.artist else "",
                genre=s.genre,
            )
            for s in songs
        ]
        return SongListResponse(items=items)

    def create_song(self, payload: SongCreateRequest, artist_id: int) -> SongResponse:
        song = self.repo.create_song(
            title=payload.title,
            genre=payload.genre,
            artist_id=artist_id,
        )
        return SongResponse(
            id=song.id,
            title=song.title,
            artist_name=song.artist.display_name if song.artist else "",
            genre=song.genre,
		)
