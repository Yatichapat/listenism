from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.modules.social.schemas import ActionResponse, CommentRequest, FollowRequest, LikeRequest
from app.modules.social.service import SocialService
from app.shared.deps import current_user_id

router = APIRouter()


@router.post("/follow", response_model=ActionResponse)
def follow_artist(
    payload: FollowRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).follow_artist(user_id=user_id, payload=payload)


@router.post("/like", response_model=ActionResponse)
def like_song(
    payload: LikeRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).like_song(user_id=user_id, payload=payload)


@router.post("/comment", response_model=ActionResponse)
def comment_song(
    payload: CommentRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).comment_song(user_id=user_id, payload=payload)
