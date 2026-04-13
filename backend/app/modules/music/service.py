from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.infrastructure.storage import get_public_file_url
from app.models.user import User, UserRole
from app.shared.exceptions import AppException
from app.modules.music.repository import MusicRepository
from app.modules.music.schemas import (
    SongCreateRequest, SongListResponse, SongResponse,
    AlbumResponse, AlbumDetailResponse, AlbumListResponse,
    ArtistResponse, ArtistListResponse,
    SearchResultsResponse,
    ArtistAnalyticsResponse, SongPlayStat,
    PlaylistAddSongRequest,
    PlaylistCreateRequest,
    PlaylistListResponse,
    PlaylistRenameRequest,
    PlaylistResponse,
    PlaylistSongResponse,
)
from app.modules.music.upload_service import MusicUploadService


class MusicService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = MusicRepository(db)
        self.upload_service = MusicUploadService(self.repo, self._map_song)

    def _ensure_artist_role(self, user_id: int) -> None:
        role = self.db.scalar(select(User.role).where(User.id == user_id))
        if role != UserRole.artist:
            raise AppException("Only artist accounts can manage uploaded songs", status_code=403)

    def _ensure_listener_or_artist_role(self, user_id: int) -> None:
        role = self.db.scalar(select(User.role).where(User.id == user_id, User.is_active.is_(True)))
        if role not in (UserRole.listener, UserRole.artist):
            raise AppException("Only listener and artist accounts can manage playlists", status_code=403)

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

    def _map_songs(self, songs) -> SongListResponse:
        return SongListResponse(items=[self._map_song(song) for song in songs])

    def _map_playlist(self, playlist) -> PlaylistResponse:
        items: list[PlaylistSongResponse] = []
        for entry in sorted(playlist.songs, key=lambda value: value.position):
            song = entry.song
            if song is None:
                continue
            song_payload = self._map_song(song)
            items.append(
                PlaylistSongResponse(
                    id=song_payload.id,
                    title=song_payload.title,
                    artist_name=song_payload.artist_name,
                    genre=song_payload.genre,
                    audio_url=song_payload.audio_url,
                    cover_url=song_payload.cover_url,
                    view_count=song_payload.view_count,
                    like_count=song_payload.like_count,
                    position=entry.position,
                )
            )

        return PlaylistResponse(
            id=playlist.id,
            user_id=playlist.user_id,
            name=playlist.name,
            created_at=playlist.created_at,
            songs=items,
        )

    def _map_artists(self, artists) -> ArtistListResponse:
        items = [
            ArtistResponse(
                id=artist.id,
                name=artist.display_name,
                followers_count=len(artist.followers) if artist.followers else 0,
                avatar_url=None,
            )
            for artist in artists
        ]
        return ArtistListResponse(items=items)

    def _delete_song_and_cleanup_album(self, song) -> None:
        album_id = song.album_id
        self.repo.delete_song(song)
        if album_id is not None and self.repo.count_songs_in_album(album_id) == 0:
            self.repo.delete_album_by_id(album_id)

    def list_songs(self) -> SongListResponse:
        return self._map_songs(self.repo.list_songs())

    def list_newest_songs(self, limit: int = 10) -> SongListResponse:
        return self._map_songs(self.repo.list_newest_songs(limit))

    def list_hot_songs(self, limit: int = 10) -> SongListResponse:
        return self._map_songs(self.repo.list_hot_songs(limit))

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
        return self._map_artists(self.repo.list_hot_artists(limit))

    def list_newest_artists(self, limit: int = 10) -> ArtistListResponse:
        return self._map_artists(self.repo.list_newest_artists(limit))

    def search(self, query: str, limit: int = 10) -> SearchResultsResponse:
        normalized = query.strip()
        if not normalized:
            return SearchResultsResponse(query=normalized)

        songs = self.repo.search_songs(normalized, limit=limit)
        albums = self.repo.search_albums(normalized, limit=limit)
        artists = self.repo.search_artists(normalized, limit=limit)
        return SearchResultsResponse(
            query=normalized,
            songs=[self._map_song(song) for song in songs],
            albums=[
                AlbumResponse(
                    id=album.id,
                    title=album.title,
                    artist_name=album.artist.display_name if album.artist else "",
                    cover_url=get_public_file_url(album.cover_url) if album.cover_url else None,
                )
                for album in albums
            ],
            artists=[
                ArtistResponse(
                    id=artist.id,
                    name=artist.display_name,
                    followers_count=len(artist.followers) if artist.followers else 0,
                    avatar_url=None,
                )
                for artist in artists
            ],
        )

    def list_recommended_songs_for_user(self, user_id: int, limit: int = 10) -> SongListResponse:
        return self._map_songs(self.repo.list_recommended_songs_for_user(user_id=user_id, limit=limit))

    def list_my_songs(self, artist_id: int) -> SongListResponse:
        self._ensure_artist_role(artist_id)
        return self._map_songs(self.repo.list_songs_by_artist(artist_id))

    def list_liked_songs(self, user_id: int) -> SongListResponse:
        return self._map_songs(self.repo.list_liked_songs_for_user(user_id))

    def create_playlist(self, user_id: int, payload: PlaylistCreateRequest) -> PlaylistResponse:
        self._ensure_listener_or_artist_role(user_id)
        name = payload.name.strip()
        if not name:
            raise AppException("Playlist name is required", status_code=400)
        playlist = self.repo.create_playlist(user_id=user_id, name=name)
        return self._map_playlist(playlist)

    def list_playlists(self, user_id: int) -> PlaylistListResponse:
        self._ensure_listener_or_artist_role(user_id)
        playlists = self.repo.list_playlists_for_user(user_id=user_id)
        return PlaylistListResponse(items=[self._map_playlist(playlist) for playlist in playlists])

    def rename_playlist(self, user_id: int, playlist_id: int, payload: PlaylistRenameRequest) -> PlaylistResponse:
        self._ensure_listener_or_artist_role(user_id)
        playlist = self.repo.get_playlist_by_id_for_user(playlist_id=playlist_id, user_id=user_id)
        if playlist is None:
            raise AppException("Playlist not found", status_code=404)
        name = payload.name.strip()
        if not name:
            raise AppException("Playlist name is required", status_code=400)
        updated = self.repo.rename_playlist(playlist, new_name=name)
        return self._map_playlist(updated)

    def delete_playlist(self, user_id: int, playlist_id: int) -> None:
        self._ensure_listener_or_artist_role(user_id)
        playlist = self.repo.get_playlist_by_id_for_user(playlist_id=playlist_id, user_id=user_id)
        if playlist is None:
            raise AppException("Playlist not found", status_code=404)
        self.repo.delete_playlist(playlist)

    def add_song_to_playlist(self, user_id: int, playlist_id: int, payload: PlaylistAddSongRequest) -> PlaylistResponse:
        self._ensure_listener_or_artist_role(user_id)
        playlist = self.repo.get_playlist_by_id_for_user(playlist_id=playlist_id, user_id=user_id)
        if playlist is None:
            raise AppException("Playlist not found", status_code=404)
        song = self.repo.get_song_by_id(payload.song_id)
        if song is None:
            raise AppException("Song not found", status_code=404)
        self.repo.add_song_to_playlist(playlist, song_id=payload.song_id)
        refreshed = self.repo.get_playlist_by_id_for_user(playlist_id=playlist_id, user_id=user_id)
        if refreshed is None:
            raise AppException("Playlist not found", status_code=404)
        return self._map_playlist(refreshed)

    def remove_song_from_playlist(self, user_id: int, playlist_id: int, song_id: int) -> PlaylistResponse:
        self._ensure_listener_or_artist_role(user_id)
        playlist = self.repo.get_playlist_by_id_for_user(playlist_id=playlist_id, user_id=user_id)
        if playlist is None:
            raise AppException("Playlist not found", status_code=404)
        removed = self.repo.remove_song_from_playlist(playlist, song_id=song_id)
        if not removed:
            raise AppException("Song is not in this playlist", status_code=404)
        refreshed = self.repo.get_playlist_by_id_for_user(playlist_id=playlist_id, user_id=user_id)
        if refreshed is None:
            raise AppException("Playlist not found", status_code=404)
        return self._map_playlist(refreshed)

    def list_feed_songs(self, user_id: int, limit: int = 20) -> SongListResponse:
        return self._map_songs(self.repo.list_feed_songs_for_user(user_id=user_id, limit=limit))

    def record_listen_event(self, user_id: int, song_id: int) -> None:
        song = self.repo.get_song_by_id(song_id)
        if song is None:
            raise AppException("Song not found", status_code=404)
        self.repo.create_listen_event(user_id=user_id, song_id=song_id)

    def update_my_song(
        self,
        *,
        artist_id: int,
        song_id: int,
        title: str | None = None,
        genre: str | None = None,
        cover_bytes: bytes | None = None,
        cover_filename: str | None = None,
        cover_content_type: str | None = None,
    ) -> SongResponse:
        self._ensure_artist_role(artist_id)
        song = self.repo.get_song_by_id(song_id)
        if song is None:
            raise AppException("Song not found", status_code=404)
        if song.artist_id != artist_id:
            raise AppException("You can only edit your own songs", status_code=403)

        if cover_bytes is not None:
            if song.album is None:
                raise AppException("Song cover can only be updated when the song belongs to an album", status_code=400)
            _, cover_url = self.upload_service._upload_payload(
                data=cover_bytes,
                filename=cover_filename,
                prefix="covers",
                artist_id=artist_id,
                content_type=cover_content_type,
                empty_error="Cover image is empty",
            )
            self.repo.update_album_cover(song.album, cover_url)

        updated_song = self.repo.update_song(
            song,
            title=title.strip() if title is not None else None,
            genre=genre.strip() if genre is not None else None,
        )
        return self._map_song(updated_song)

    def list_genre_fallback_songs_for_new_user(self, limit: int = 10) -> SongListResponse:
        return self._map_songs(self.repo.list_genre_fallback_songs_for_new_user(limit=limit))

    def delete_my_song(self, artist_id: int, song_id: int) -> None:
        self._ensure_artist_role(artist_id)
        song = self.repo.get_song_by_id(song_id)
        if song is None:
            raise AppException("Song not found", status_code=404)
        if song.artist_id != artist_id:
            raise AppException("You can only delete your own songs", status_code=403)
        self._delete_song_and_cleanup_album(song)

    def get_artist_analytics(self, artist_id: int) -> ArtistAnalyticsResponse:
        self._ensure_artist_role(artist_id)
        data = self.repo.get_artist_analytics(artist_id)
        return ArtistAnalyticsResponse(
            artist_id=int(data["artist_id"]),
            artist_name=str(data["artist_name"]),
            follower_count=int(data["follower_count"]),
            total_songs=int(data["total_songs"]),
            total_plays=int(data["total_plays"]),
            top_songs=[
                SongPlayStat(
                    id=item["id"],
                    title=item["title"],
                    genre=item["genre"],
                    play_count=item["play_count"],
                    like_count=item["like_count"],
                )
                for item in data["top_songs"]
            ],
        )

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
        return self.upload_service.create_song_with_files(
            title=title,
            genre=genre,
            artist_id=artist_id,
            audio_bytes=audio_bytes,
            audio_filename=audio_filename,
            audio_content_type=audio_content_type,
            album_title=album_title,
            cover_bytes=cover_bytes,
            cover_filename=cover_filename,
            cover_content_type=cover_content_type,
        )

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
        return self.upload_service.create_uploaded_songs(
            upload_type=upload_type,
            title=title,
            genre=genre,
            artist_id=artist_id,
            track_titles=track_titles,
            audio_file=audio_file,
            audio_files=audio_files,
            album_title=album_title,
            cover_file=cover_file,
        )
