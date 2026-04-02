from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.modules.music.schemas import (
    SongCreateRequest, SongListResponse, SongResponse,
    AlbumListResponse, ArtistListResponse
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


@router.get("/songs/mine", response_model=SongListResponse)
def list_my_songs(
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongListResponse:
    return MusicService(db).list_my_songs(artist_id=artist_id)

@router.get("/albums/newest", response_model=AlbumListResponse)
def list_newest_albums(limit: int = Query(10), db: Session = Depends(get_db)) -> AlbumListResponse:
    return MusicService(db).list_newest_albums(limit)

@router.get("/artists/hot", response_model=ArtistListResponse)
def list_hot_artists(limit: int = Query(10), db: Session = Depends(get_db)) -> ArtistListResponse:
    return MusicService(db).list_hot_artists(limit)

@router.get("/artists/newest", response_model=ArtistListResponse)
def list_newest_artists(limit: int = Query(10), db: Session = Depends(get_db)) -> ArtistListResponse:
    return MusicService(db).list_newest_artists(limit)


@router.post("/songs", response_model=SongResponse)
def create_song(
    payload: SongCreateRequest,
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongResponse:
    return MusicService(db).create_song(payload, artist_id=artist_id)


@router.post("/songs/upload", response_model=SongResponse)
async def upload_song(
    title: str = Form(...),
    genre: str | None = Form(None),
    album_title: str | None = Form(None),
    audio_file: UploadFile = File(...),
    cover_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongResponse:
    if not title.strip():
        raise AppException("Song title is required", status_code=400)

    audio_content = await audio_file.read()
    if not audio_content:
        raise AppException("Audio file is empty", status_code=400)

    cover_content: bytes | None = None
    if cover_file is not None:
        cover_content = await cover_file.read()
        if not cover_content:
            cover_content = None

    return MusicService(db).create_song_with_files(
        title=title,
        genre=genre,
        artist_id=artist_id,
        audio_bytes=audio_content,
        audio_filename=audio_file.filename or "audio.bin",
        audio_content_type=audio_file.content_type,
        album_title=album_title,
        cover_bytes=cover_content,
        cover_filename=cover_file.filename if cover_file else None,
        cover_content_type=cover_file.content_type if cover_file else None,
    )


@router.delete("/songs/{song_id}", status_code=204)
def delete_my_song(
    song_id: int,
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> None:
    MusicService(db).delete_my_song(artist_id=artist_id, song_id=song_id)
