from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.modules.social.schemas import (
    ActionResponse,
    CommentRequest,
    CommentUpdateRequest,
    CommentListResponse,
    FollowRequest,
    LikeRequest,
    SongReportListResponse,
    SongReportRequest,
    UserReportListResponse,
    UserReportRequest,
)
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


@router.post("/unfollow", response_model=ActionResponse)
def unfollow_artist(
    payload: FollowRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).unfollow_artist(user_id=user_id, payload=payload)


@router.post("/like", response_model=ActionResponse)
def like_song(
    payload: LikeRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).like_song(user_id=user_id, payload=payload)


@router.post("/unlike", response_model=ActionResponse)
def unlike_song(
    payload: LikeRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).unlike_song(user_id=user_id, payload=payload)


@router.post("/comment", response_model=ActionResponse)
def comment_song(
    payload: CommentRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).comment_song(user_id=user_id, payload=payload)


@router.get("/comments", response_model=CommentListResponse)
def list_comments(
    song_id: int,
    db: Session = Depends(get_db),
) -> CommentListResponse:
    return SocialService(db).list_comments(song_id=song_id)


@router.patch("/comment/{comment_id}", response_model=ActionResponse)
def update_comment(
    comment_id: int,
    payload: CommentUpdateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).update_comment(user_id=user_id, comment_id=comment_id, payload=payload)


@router.delete("/comment/{comment_id}", response_model=ActionResponse)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).delete_comment(user_id=user_id, comment_id=comment_id)


@router.post("/report/song", response_model=ActionResponse)
def report_song(
    payload: SongReportRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).report_song(user_id=user_id, payload=payload)


@router.post("/report/user", response_model=ActionResponse)
def report_user(
    payload: UserReportRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> ActionResponse:
    return SocialService(db).report_user(user_id=user_id, payload=payload)


@router.get("/reports/songs", response_model=SongReportListResponse)
def list_song_reports(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> SongReportListResponse:
    return SocialService(db).list_song_reports(admin_id=user_id)


@router.get("/reports/users", response_model=UserReportListResponse)
def list_user_reports(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> UserReportListResponse:
    return SocialService(db).list_user_reports(admin_id=user_id)
