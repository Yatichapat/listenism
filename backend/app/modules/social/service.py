from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.modules.social.repository import SocialRepository
from app.modules.social.schemas import (
    ActionResponse,
    CommentRequest,
    FollowRequest,
    LikeRequest,
    SongReportItem,
    SongReportListResponse,
    SongReportRequest,
    UserReportItem,
    UserReportListResponse,
    UserReportRequest,
)
from app.shared.exceptions import AppException


class SocialService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = SocialRepository(db)

    def _ensure_admin_role(self, user_id: int) -> None:
        role = self.db.scalar(select(User.role).where(User.id == user_id, User.is_active.is_(True)))
        if role != UserRole.admin:
            raise AppException("Admin access required", status_code=403)

    def follow_artist(self, user_id: int, payload: FollowRequest) -> ActionResponse:
        self.repo.follow_artist(user_id, payload.artist_id)
        return ActionResponse(message="Followed artist")

    def unfollow_artist(self, user_id: int, payload: FollowRequest) -> ActionResponse:
        self.repo.unfollow_artist(user_id, payload.artist_id)
        return ActionResponse(message="Unfollowed artist")

    def like_song(self, user_id: int, payload: LikeRequest) -> ActionResponse:
        self.repo.like_song(user_id, payload.song_id)
        return ActionResponse(message="Liked song")

    def unlike_song(self, user_id: int, payload: LikeRequest) -> ActionResponse:
        self.repo.unlike_song(user_id, payload.song_id)
        return ActionResponse(message="Unliked song")

    def comment_song(self, user_id: int, payload: CommentRequest) -> ActionResponse:
        self.repo.comment_song(user_id, payload.song_id, payload.content)
        return ActionResponse(message="Comment added")

    def report_song(self, user_id: int, payload: SongReportRequest) -> ActionResponse:
        self.repo.report_song(user_id, payload.song_id, payload.reason)
        return ActionResponse(message="Song reported")

    def report_user(self, user_id: int, payload: UserReportRequest) -> ActionResponse:
        self.repo.report_user(user_id, payload.user_id, payload.reason)
        return ActionResponse(message="User reported")

    def list_song_reports(self, admin_id: int) -> SongReportListResponse:
        self._ensure_admin_role(admin_id)
        rows = self.repo.list_song_reports()
        items = [
            SongReportItem(
                id=report.id,
                song_id=song.id,
                song_title=song.title,
                reporter_id=reporter.id,
                reporter_email=reporter.email,
                reason=report.reason,
                created_at=report.created_at,
            )
            for report, song, reporter in rows
        ]
        return SongReportListResponse(items=items)

    def list_user_reports(self, admin_id: int) -> UserReportListResponse:
        self._ensure_admin_role(admin_id)
        rows = self.repo.list_user_reports()
        items = [
            UserReportItem(
                id=report.id,
                reported_user_id=reported_user_id,
                reported_user_email=reported_user_email,
                reporter_id=reporter_id,
                reporter_email=reporter_email,
                reason=report.reason,
                created_at=report.created_at,
            )
            for report, reporter_id, reporter_email, reported_user_id, reported_user_email in rows
        ]
        return UserReportListResponse(items=items)
