from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.modules.music.schemas import (
    SongCreateRequest, SongListResponse, SongResponse,
    AlbumListResponse, AlbumDetailResponse, ArtistListResponse, ActionResponse,
    SearchResultsResponse,
    ArtistAnalyticsResponse,
    PlaylistAddSongRequest,
    PlaylistCreateRequest,
    PlaylistListResponse,
    PlaylistRenameRequest,
    PlaylistResponse,
)
from app.modules.music.service import MusicService
from app.shared.deps import current_user_id
from app.shared.exceptions import AppException

router = APIRouter()


@router.get("/songs", response_model=SongListResponse)
def list_songs(db: Session = Depends(get_db)) -> SongListResponse:
    return MusicService(db).list_songs()

@router.get("/songs/newest", response_model=SongListResponse)
def list_newest_songs(limit: int = Query(10), db: Session = Depends(get_db)) -> SongListResponse:
    return MusicService(db).list_newest_songs(limit)

@router.get("/songs/hot", response_model=SongListResponse)
def list_hot_songs(limit: int = Query(10), db: Session = Depends(get_db)) -> SongListResponse:
    return MusicService(db).list_hot_songs(limit)


@router.get("/songs/recommended", response_model=SongListResponse)
def list_recommended_songs(
    limit: int = Query(10),
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> SongListResponse:
    return MusicService(db).list_recommended_songs_for_user(user_id=user_id, limit=limit)


@router.get("/songs/feed", response_model=SongListResponse)
def list_feed_songs(
    limit: int = Query(20),
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> SongListResponse:
    return MusicService(db).list_feed_songs(user_id=user_id, limit=limit)


@router.get("/songs/fallback/genre", response_model=SongListResponse)
def list_genre_fallback_songs(
    limit: int = Query(10),
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> SongListResponse:
    _ = user_id
    return MusicService(db).list_genre_fallback_songs_for_new_user(limit=limit)


@router.get("/songs/mine", response_model=SongListResponse)
def list_my_songs(
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongListResponse:
    return MusicService(db).list_my_songs(artist_id=artist_id)


@router.get("/songs/liked", response_model=SongListResponse)
def list_liked_songs(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> SongListResponse:
    return MusicService(db).list_liked_songs(user_id=user_id)


@router.post("/playlists", response_model=PlaylistResponse)
def create_playlist(
    payload: PlaylistCreateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> PlaylistResponse:
    return MusicService(db).create_playlist(user_id=user_id, payload=payload)


@router.get("/playlists", response_model=PlaylistListResponse)
def list_playlists(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> PlaylistListResponse:
    return MusicService(db).list_playlists(user_id=user_id)


@router.patch("/playlists/{playlist_id}", response_model=PlaylistResponse)
def rename_playlist(
    playlist_id: int,
    payload: PlaylistRenameRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> PlaylistResponse:
    return MusicService(db).rename_playlist(user_id=user_id, playlist_id=playlist_id, payload=payload)


@router.delete("/playlists/{playlist_id}", status_code=204)
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> None:
    MusicService(db).delete_playlist(user_id=user_id, playlist_id=playlist_id)


@router.post("/playlists/{playlist_id}/songs", response_model=PlaylistResponse)
def add_song_to_playlist(
    playlist_id: int,
    payload: PlaylistAddSongRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> PlaylistResponse:
    return MusicService(db).add_song_to_playlist(user_id=user_id, playlist_id=playlist_id, payload=payload)


@router.delete("/playlists/{playlist_id}/songs/{song_id}", response_model=PlaylistResponse)
def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> PlaylistResponse:
    return MusicService(db).remove_song_from_playlist(user_id=user_id, playlist_id=playlist_id, song_id=song_id)

@router.get("/albums/newest", response_model=AlbumListResponse)
def list_newest_albums(limit: int = Query(10), db: Session = Depends(get_db)) -> AlbumListResponse:
    return MusicService(db).list_newest_albums(limit)


@router.get("/albums/{album_id}", response_model=AlbumDetailResponse)
def get_album_detail(album_id: int, db: Session = Depends(get_db)) -> AlbumDetailResponse:
    return MusicService(db).get_album_detail(album_id)

@router.get("/artists/hot", response_model=ArtistListResponse)
def list_hot_artists(limit: int = Query(10), db: Session = Depends(get_db)) -> ArtistListResponse:
    return MusicService(db).list_hot_artists(limit)

@router.get("/artists/newest", response_model=ArtistListResponse)
def list_newest_artists(limit: int = Query(10), db: Session = Depends(get_db)) -> ArtistListResponse:
    return MusicService(db).list_newest_artists(limit)


@router.get("/search", response_model=SearchResultsResponse)
def search_music(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> SearchResultsResponse:
    return MusicService(db).search(query=q, limit=limit)


@router.post("/songs", response_model=SongResponse)
def create_song(
    payload: SongCreateRequest,
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongResponse:
    return MusicService(db).create_song(payload, artist_id=artist_id)


@router.post("/songs/upload", response_model=SongListResponse)
async def upload_song(
    upload_type: Literal["single", "album"] = Form("single"),
    title: str | None = Form(None),
    genre: str | None = Form(None),
    album_title: str | None = Form(None),
    track_titles: list[str] | None = Form(None),
    audio_file: UploadFile | None = File(None),
    audio_files: list[UploadFile] | None = File(None),
    cover_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongListResponse:
    return MusicService(db).create_uploaded_songs(
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


@router.patch("/songs/{song_id}", response_model=SongResponse)
async def update_my_song(
    song_id: int,
    title: str | None = Form(None),
    genre: str | None = Form(None),
    cover_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongResponse:
    cover_bytes = None
    cover_filename = None
    cover_content_type = None
    if cover_file is not None:
        cover_bytes = cover_file.file.read()
        cover_filename = cover_file.filename
        cover_content_type = cover_file.content_type

    return MusicService(db).update_my_song(
        artist_id=artist_id,
        song_id=song_id,
        title=title,
        genre=genre,
        cover_bytes=cover_bytes,
        cover_filename=cover_filename,
        cover_content_type=cover_content_type,
    )


@router.delete("/songs/{song_id}", status_code=204)
def delete_my_song(
    song_id: int,
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> None:
    MusicService(db).delete_my_song(artist_id=artist_id, song_id=song_id)


@router.post("/songs/{song_id}/listen", response_model=ActionResponse)
def record_song_listen(
    song_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    MusicService(db).record_listen_event(user_id=user_id, song_id=song_id)
    return ActionResponse(message="Listen event recorded")


@router.get("/analytics/artist", response_model=ArtistAnalyticsResponse)
def get_artist_analytics(
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> ArtistAnalyticsResponse:
    return MusicService(db).get_artist_analytics(artist_id=artist_id)
