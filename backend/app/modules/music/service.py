from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.storage import get_public_file_url, upload_bytes
from app.models.user import User, UserRole
from app.shared.exceptions import AppException
from app.modules.music.repository import MusicRepository
from app.modules.music.schemas import (
    SongCreateRequest, SongListResponse, SongResponse,
    AlbumResponse, AlbumListResponse,
    ArtistResponse, ArtistListResponse
)


class MusicService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = MusicRepository(db)

    def _ensure_artist_role(self, user_id: int) -> None:
        role = self.db.scalar(select(User.role).where(User.id == user_id))
        if role != UserRole.artist:
            raise AppException("Only artist accounts can manage uploaded songs", status_code=403)

    def _map_song(self, s, view_count=None, like_count=None) -> SongResponse:
        return SongResponse(
            id=s.id,
            title=s.title,
            artist_name=s.artist.display_name if s.artist else "",
            genre=s.genre,
            audio_url=get_public_file_url(s.file_key) if s.file_key else None,
            cover_url=get_public_file_url(s.album.cover_url) if s.album and s.album.cover_url else None,
            view_count=view_count,
            like_count=like_count,
        )

    def list_songs(self) -> SongListResponse:
        songs = self.repo.list_songs()
        items = [self._map_song(s) for s in songs]
        return SongListResponse(items=items)

    def list_newest_songs(self, limit: int = 10) -> SongListResponse:
        songs = self.repo.list_newest_songs(limit)
        items = [self._map_song(s) for s in songs]
        return SongListResponse(items=items)

    def list_hot_songs(self, limit: int = 10) -> SongListResponse:
        songs = self.repo.list_hot_songs(limit)
        items = [self._map_song(s) for s in songs]
        return SongListResponse(items=items)

    def list_newest_albums(self, limit: int = 10) -> AlbumListResponse:
        albums = self.repo.list_newest_albums(limit)
        items = [
            AlbumResponse(
                id=a.id,
                title=a.title,
                artist_name=a.artist.display_name if a.artist else "",
                cover_url=a.cover_url,
            )
            for a in albums
        ]
        return AlbumListResponse(items=items)

    def list_hot_artists(self, limit: int = 10) -> ArtistListResponse:
        artists = self.repo.list_hot_artists(limit)
        items = [
            ArtistResponse(
                id=u.id,
                name=u.display_name,
                followers_count=len(u.followers) if u.followers else 0, # Note: using relationship might cause N+1 query, but fine for prototype
                avatar_url=None,
            )
            for u in artists
        ]
        return ArtistListResponse(items=items)

    def list_newest_artists(self, limit: int = 10) -> ArtistListResponse:
        artists = self.repo.list_newest_artists(limit)
        items = [
            ArtistResponse(
                id=u.id,
                name=u.display_name,
                followers_count=len(u.followers) if u.followers else 0,
                avatar_url=None,
            )
            for u in artists
        ]
        return ArtistListResponse(items=items)

    def list_recommended_songs_for_user(self, user_id: int, limit: int = 10) -> SongListResponse:
        songs = self.repo.list_recommended_songs_for_user(user_id=user_id, limit=limit)
        items = [self._map_song(s) for s in songs]
        return SongListResponse(items=items)

    def list_my_songs(self, artist_id: int) -> SongListResponse:
        self._ensure_artist_role(artist_id)
        songs = self.repo.list_songs_by_artist(artist_id)
        items = [self._map_song(s) for s in songs]
        return SongListResponse(items=items)

    def delete_my_song(self, artist_id: int, song_id: int) -> None:
        self._ensure_artist_role(artist_id)
        song = self.repo.get_song_by_id(song_id)
        if song is None:
            raise AppException("Song not found", status_code=404)
        if song.artist_id != artist_id:
            raise AppException("You can only delete your own songs", status_code=403)
        self.repo.delete_song(song)

    def create_song(self, payload: SongCreateRequest, artist_id: int) -> SongResponse:
        song = self.repo.create_song(
            title=payload.title,
            genre=payload.genre,
            artist_id=artist_id,
        )
        return self._map_song(song)

    def create_song_with_files(
        self,
        *,
        title: str,
        genre: str | None,
        artist_id: int,
        audio_bytes: bytes,
        audio_filename: str,
        audio_content_type: str | None,
        album_title: str | None,
        cover_bytes: bytes | None = None,
        cover_filename: str | None = None,
        cover_content_type: str | None = None,
    ) -> SongResponse:
        date_prefix = datetime.utcnow().strftime("%Y%m%d")
        audio_ext = audio_filename.rsplit(".", 1)[-1].lower() if "." in audio_filename else "bin"
        audio_key = f"songs/{artist_id}/{date_prefix}/{uuid4().hex}.{audio_ext}"
        upload_bytes(audio_bytes, audio_key, audio_content_type)

        album_id: int | None = None
        if album_title and album_title.strip():
            cover_url: str | None = None
            if cover_bytes:
                cover_name = cover_filename or "cover.jpg"
                cover_ext = cover_name.rsplit(".", 1)[-1].lower() if "." in cover_name else "jpg"
                cover_key = f"covers/{artist_id}/{date_prefix}/{uuid4().hex}.{cover_ext}"
                upload_bytes(cover_bytes, cover_key, cover_content_type)
                cover_url = get_public_file_url(cover_key)

            album = self.repo.get_or_create_album(
                title=album_title,
                artist_id=artist_id,
                cover_url=cover_url,
            )
            album_id = album.id

        song = self.repo.create_song(
            title=title.strip(),
            genre=genre,
            artist_id=artist_id,
            file_key=audio_key,
            album_id=album_id,
        )
        return self._map_song(song)
