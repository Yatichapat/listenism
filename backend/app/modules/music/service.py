from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.infrastructure.storage import get_public_file_url, upload_bytes
from app.models.user import User, UserRole
from app.shared.exceptions import AppException
from app.modules.music.repository import MusicRepository
from app.modules.music.schemas import (
    SongCreateRequest, SongListResponse, SongResponse,
    AlbumResponse, AlbumDetailResponse, AlbumListResponse,
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

    def _ensure_admin_role(self, user_id: int) -> None:
        role = self.db.scalar(select(User.role).where(User.id == user_id, User.is_active.is_(True)))
        if role != UserRole.admin:
            raise AppException("Admin access required", status_code=403)

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
                cover_url=get_public_file_url(a.cover_url) if a.cover_url else None,
            )
            for a in albums
        ]
        return AlbumListResponse(items=items)

    def get_album_detail(self, album_id: int) -> AlbumDetailResponse:
        album = self.repo.get_album_by_id(album_id)
        if album is None:
            raise AppException("Album not found", status_code=404)

        songs = sorted(
            album.songs,
            key=lambda song: song.created_at or datetime.min,
            reverse=True,
        )

        return AlbumDetailResponse(
            id=album.id,
            title=album.title,
            artist_name=album.artist.display_name if album.artist else "",
            cover_url=get_public_file_url(album.cover_url) if album.cover_url else None,
            songs=[self._map_song(song) for song in songs],
        )

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
        album_id = song.album_id
        self.repo.delete_song(song)
        if album_id is not None and self.repo.count_songs_in_album(album_id) == 0:
            self.repo.delete_album_by_id(album_id)

    def delete_song_as_admin(self, admin_id: int, song_id: int) -> None:
        self._ensure_admin_role(admin_id)
        song = self.repo.get_song_by_id(song_id)
        if song is None:
            raise AppException("Song not found", status_code=404)
        album_id = song.album_id
        self.repo.delete_song(song)
        if album_id is not None and self.repo.count_songs_in_album(album_id) == 0:
            self.repo.delete_album_by_id(album_id)

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

    def create_uploaded_songs(
        self,
        *,
        upload_type: str,
        title: str | None,
        genre: str | None,
        artist_id: int,
        track_titles: list[str] | None = None,
        audio_file: UploadFile | None = None,
        audio_files: list[UploadFile] | None = None,
        album_title: str | None = None,
        cover_file: UploadFile | None = None,
    ) -> SongListResponse:
        self._ensure_artist_role(artist_id)

        cover_bytes: bytes | None = None
        cover_filename: str | None = None
        cover_content_type: str | None = None
        if cover_file is not None:
            cover_bytes = cover_file.file.read()
            if cover_bytes:
                cover_filename = cover_file.filename or "cover.jpg"
                cover_content_type = cover_file.content_type

        uploaded_songs = []

        if upload_type == "album":
            if not album_title or not album_title.strip():
                raise AppException("Album title is required for album uploads", status_code=400)
            if not cover_bytes:
                raise AppException("Album cover is required for album uploads", status_code=400)
            files = audio_files or []
            if not files:
                raise AppException("Please select at least one audio file for the album", status_code=400)

            date_prefix = datetime.utcnow().strftime("%Y%m%d")
            cover_name = cover_filename or "cover.jpg"
            cover_ext = cover_name.rsplit(".", 1)[-1].lower() if "." in cover_name else "jpg"
            cover_key = f"covers/{artist_id}/{date_prefix}/{uuid4().hex}.{cover_ext}"
            upload_bytes(cover_bytes, cover_key, cover_content_type)
            cover_url = get_public_file_url(cover_key)

            album = self.repo.get_or_create_album(
                title=album_title.strip(),
                artist_id=artist_id,
                cover_url=cover_url,
            )

            for index, file_item in enumerate(files):
                audio_bytes = file_item.file.read()
                if not audio_bytes:
                    continue
                file_name = file_item.filename or "audio.bin"
                audio_ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"
                audio_key = f"songs/{artist_id}/{date_prefix}/{uuid4().hex}.{audio_ext}"
                upload_bytes(audio_bytes, audio_key, file_item.content_type)
                provided_title = None
                if track_titles and index < len(track_titles):
                    provided_title = track_titles[index].strip() or None
                song_title = provided_title or file_name.rsplit(".", 1)[0].strip() or album_title.strip()
                song = self.repo.create_song(
                    title=song_title,
                    genre=genre,
                    artist_id=artist_id,
                    file_key=audio_key,
                    album_id=album.id,
                )
                uploaded_songs.append(self._map_song(song))

            if not uploaded_songs:
                raise AppException("All selected album files were empty", status_code=400)

            return SongListResponse(items=uploaded_songs)

        if not title or not title.strip():
            raise AppException("Song title is required for single uploads", status_code=400)
        if audio_file is None:
            raise AppException("Audio file is required", status_code=400)
        if not cover_bytes:
            raise AppException("Cover image is required for single uploads", status_code=400)

        audio_bytes = audio_file.file.read()
        if not audio_bytes:
            raise AppException("Audio file is empty", status_code=400)

        date_prefix = datetime.utcnow().strftime("%Y%m%d")
        cover_name = cover_filename or "cover.jpg"
        cover_ext = cover_name.rsplit(".", 1)[-1].lower() if "." in cover_name else "jpg"
        cover_key = f"covers/{artist_id}/{date_prefix}/{uuid4().hex}.{cover_ext}"
        upload_bytes(cover_bytes, cover_key, cover_content_type)

        audio_name = audio_file.filename or "audio.bin"
        audio_ext = audio_name.rsplit(".", 1)[-1].lower() if "." in audio_name else "bin"
        audio_key = f"songs/{artist_id}/{date_prefix}/{uuid4().hex}.{audio_ext}"
        upload_bytes(audio_bytes, audio_key, audio_file.content_type)

        album = self.repo.get_or_create_album(
            title=album_title.strip() if album_title and album_title.strip() else title.strip(),
            artist_id=artist_id,
            cover_url=get_public_file_url(cover_key),
        )

        song = self.repo.create_song(
            title=title.strip(),
            genre=genre,
            artist_id=artist_id,
            file_key=audio_key,
            album_id=album.id,
        )
        uploaded_songs.append(self._map_song(song))
        return SongListResponse(items=uploaded_songs)
