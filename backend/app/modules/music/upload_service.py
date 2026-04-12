from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from uuid import uuid4

from fastapi import UploadFile

from app.infrastructure.storage import get_public_file_url, upload_bytes
from app.modules.music.repository import MusicRepository
from app.modules.music.schemas import SongListResponse, SongResponse
from app.shared.exceptions import AppException


class MusicUploadService:
    def __init__(self, repo: MusicRepository, map_song: Callable[[object], SongResponse]) -> None:
        self.repo = repo
        self.map_song = map_song

    def _date_prefix(self) -> str:
        return datetime.utcnow().strftime("%Y%m%d")

    def _upload_payload(
        self,
        *,
        data: bytes,
        filename: str | None,
        prefix: str,
        artist_id: int,
        content_type: str | None,
        empty_error: str,
    ) -> tuple[str, str]:
        if not data:
            raise AppException(empty_error, status_code=400)

        safe_filename = filename or "file.bin"
        ext = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else "bin"
        key = f"{prefix}/{artist_id}/{self._date_prefix()}/{uuid4().hex}.{ext}"
        upload_bytes(data, key, content_type)
        return key, get_public_file_url(key)

    def _upload_file(self, file: UploadFile, prefix: str, artist_id: int, empty_error: str) -> tuple[bytes, str, str]:
        data = file.file.read()
        key, url = self._upload_payload(
            data=data,
            filename=file.filename,
            prefix=prefix,
            artist_id=artist_id,
            content_type=file.content_type,
            empty_error=empty_error,
        )
        return data, key, url

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
        audio_key, _ = self._upload_payload(
            data=audio_bytes,
            filename=audio_filename,
            prefix="songs",
            artist_id=artist_id,
            content_type=audio_content_type,
            empty_error="Audio file is empty",
        )

        album_id: int | None = None
        if album_title and album_title.strip():
            cover_url: str | None = None
            if cover_bytes:
                _, cover_url = self._upload_payload(
                    data=cover_bytes,
                    filename=cover_filename,
                    prefix="covers",
                    artist_id=artist_id,
                    content_type=cover_content_type,
                    empty_error="Cover image is empty",
                )

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
        return self.map_song(song)

    def _create_album_upload(
        self,
        *,
        genre: str | None,
        artist_id: int,
        track_titles: list[str] | None,
        audio_files: list[UploadFile] | None,
        album_title: str | None,
        cover_file: UploadFile | None,
    ) -> SongListResponse:
        if not album_title or not album_title.strip():
            raise AppException("Album title is required for album uploads", status_code=400)
        if cover_file is None:
            raise AppException("Album cover is required for album uploads", status_code=400)

        files = audio_files or []
        if not files:
            raise AppException("Please select at least one audio file for the album", status_code=400)

        _, _, cover_url = self._upload_file(
            cover_file,
            "covers",
            artist_id,
            "Album cover is required for album uploads",
        )

        album = self.repo.get_or_create_album(
            title=album_title.strip(),
            artist_id=artist_id,
            cover_url=cover_url,
        )

        uploaded_songs: list[SongResponse] = []
        for index, file_item in enumerate(files):
            audio_bytes = file_item.file.read()
            if not audio_bytes:
                continue

            audio_key, _ = self._upload_payload(
                data=audio_bytes,
                filename=file_item.filename,
                prefix="songs",
                artist_id=artist_id,
                content_type=file_item.content_type,
                empty_error="Audio file is empty",
            )

            provided_title = None
            if track_titles and index < len(track_titles):
                provided_title = track_titles[index].strip() or None

            fallback_title = (file_item.filename or "").rsplit(".", 1)[0].strip()
            song_title = provided_title or fallback_title or album_title.strip()
            song = self.repo.create_song(
                title=song_title,
                genre=genre,
                artist_id=artist_id,
                file_key=audio_key,
                album_id=album.id,
            )
            uploaded_songs.append(self.map_song(song))

        if not uploaded_songs:
            raise AppException("All selected album files were empty", status_code=400)

        return SongListResponse(items=uploaded_songs)

    def _create_single_upload(
        self,
        *,
        title: str | None,
        genre: str | None,
        artist_id: int,
        audio_file: UploadFile | None,
        album_title: str | None,
        cover_file: UploadFile | None,
    ) -> SongListResponse:
        if not title or not title.strip():
            raise AppException("Song title is required for single uploads", status_code=400)
        if audio_file is None:
            raise AppException("Audio file is required", status_code=400)
        if cover_file is None:
            raise AppException("Cover image is required for single uploads", status_code=400)

        _, audio_key, _ = self._upload_file(audio_file, "songs", artist_id, "Audio file is empty")
        _, _, cover_url = self._upload_file(
            cover_file,
            "covers",
            artist_id,
            "Cover image is required for single uploads",
        )

        normalized_title = title.strip()
        normalized_album_title = album_title.strip() if album_title and album_title.strip() else normalized_title
        album = self.repo.get_or_create_album(
            title=normalized_album_title,
            artist_id=artist_id,
            cover_url=cover_url,
        )

        song = self.repo.create_song(
            title=normalized_title,
            genre=genre,
            artist_id=artist_id,
            file_key=audio_key,
            album_id=album.id,
        )
        return SongListResponse(items=[self.map_song(song)])

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
        if upload_type == "album":
            return self._create_album_upload(
                genre=genre,
                artist_id=artist_id,
                track_titles=track_titles,
                audio_files=audio_files,
                album_title=album_title,
                cover_file=cover_file,
            )

        return self._create_single_upload(
            title=title,
            genre=genre,
            artist_id=artist_id,
            audio_file=audio_file,
            album_title=album_title,
            cover_file=cover_file,
        )
