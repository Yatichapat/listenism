from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.report import SongReport, UserReport
from app.models.song import Song
from app.models.social import Comment, Follow, Like
from app.models.user import User
from app.shared.exceptions import AppException


class SocialRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def follow_artist(self, user_id: int, artist_id: int) -> None:
        exists = self.db.scalar(
            select(Follow).where(Follow.follower_id == user_id, Follow.artist_id == artist_id)
        )
        if not exists:
            self.db.add(Follow(follower_id=user_id, artist_id=artist_id))
            self.db.commit()

    def unfollow_artist(self, user_id: int, artist_id: int) -> None:
        exists = self.db.scalar(
            select(Follow).where(Follow.follower_id == user_id, Follow.artist_id == artist_id)
        )
        if exists:
            self.db.delete(exists)
            self.db.commit()

    def like_song(self, user_id: int, song_id: int) -> None:
        exists = self.db.scalar(
            select(Like).where(Like.user_id == user_id, Like.song_id == song_id)
        )
        if not exists:
            self.db.add(Like(user_id=user_id, song_id=song_id))
            self.db.commit()

    def unlike_song(self, user_id: int, song_id: int) -> None:
        exists = self.db.scalar(
            select(Like).where(Like.user_id == user_id, Like.song_id == song_id)
        )
        if exists:
            self.db.delete(exists)
            self.db.commit()

    def comment_song(self, user_id: int, song_id: int, content: str) -> None:
        self.db.add(Comment(user_id=user_id, song_id=song_id, content=content))
        self.db.commit()

    def list_comments_for_song(self, song_id: int) -> list[tuple[Comment, str]]:
        rows = self.db.execute(
            select(Comment, User.display_name)
            .join(User, User.id == Comment.user_id)
            .where(Comment.song_id == song_id)
            .order_by(Comment.created_at.asc())
        ).all()
        return [(comment, user_name) for comment, user_name in rows]

    def report_song(self, reporter_id: int, song_id: int, reason: str | None) -> None:
        song_exists = self.db.scalar(select(Song.id).where(Song.id == song_id))
        if song_exists is None:
            raise AppException("Song not found", status_code=404)

        report = self.db.scalar(
            select(SongReport).where(SongReport.reporter_id == reporter_id, SongReport.song_id == song_id)
        )
        if report is None:
            self.db.add(SongReport(reporter_id=reporter_id, song_id=song_id, reason=reason))
        else:
            report.reason = reason
            self.db.add(report)
        self.db.commit()

    def report_user(self, reporter_id: int, reported_user_id: int, reason: str | None) -> None:
        if reporter_id == reported_user_id:
            raise AppException("You cannot report yourself", status_code=400)

        user_exists = self.db.scalar(select(User.id).where(User.id == reported_user_id))
        if user_exists is None:
            raise AppException("User not found", status_code=404)

        report = self.db.scalar(
            select(UserReport).where(
                UserReport.reporter_id == reporter_id,
                UserReport.reported_user_id == reported_user_id,
            )
        )
        if report is None:
            self.db.add(UserReport(reporter_id=reporter_id, reported_user_id=reported_user_id, reason=reason))
        else:
            report.reason = reason
            self.db.add(report)
        self.db.commit()

    def list_song_reports(self) -> list[tuple[SongReport, Song, User]]:
        rows = self.db.execute(
            select(SongReport, Song, User)
            .join(Song, Song.id == SongReport.song_id)
            .join(User, User.id == SongReport.reporter_id)
            .order_by(SongReport.created_at.desc())
        ).all()
        return [(row[0], row[1], row[2]) for row in rows]

    def list_user_reports(self) -> list[tuple[UserReport, int, str, int, str]]:
        reporter = User.__table__.alias("reporter")
        reported = User.__table__.alias("reported")

        rows = self.db.execute(
            select(
                UserReport,
                reporter.c.id,
                reporter.c.email,
                reported.c.id,
                reported.c.email,
            )
            .join(reporter, reporter.c.id == UserReport.reporter_id)
            .join(reported, reported.c.id == UserReport.reported_user_id)
            .order_by(UserReport.created_at.desc())
        ).all()

        return [
            (report, reporter_id, reporter_email, reported_id, reported_email)
            for report, reporter_id, reporter_email, reported_id, reported_email in rows
        ]

