from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.modules.music.schemas import SongCreateRequest, SongListResponse, SongResponse
from app.modules.music.service import MusicService
from app.shared.deps import current_user_id

router = APIRouter()


@router.get("/songs", response_model=SongListResponse)
def list_songs(db: Session = Depends(get_db)) -> SongListResponse:
    return MusicService(db).list_songs()


@router.post("/songs", response_model=SongResponse)
def create_song(
    payload: SongCreateRequest,
    db: Session = Depends(get_db),
    artist_id: int = Depends(current_user_id),
) -> SongResponse:
    return MusicService(db).create_song(payload, artist_id=artist_id)
