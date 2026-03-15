from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.social import Comment, Follow, Like


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

    def like_song(self, user_id: int, song_id: int) -> None:
        exists = self.db.scalar(
            select(Like).where(Like.user_id == user_id, Like.song_id == song_id)
        )
        if not exists:
            self.db.add(Like(user_id=user_id, song_id=song_id))
            self.db.commit()

    def comment_song(self, user_id: int, song_id: int, content: str) -> None:
        self.db.add(Comment(user_id=user_id, song_id=song_id, content=content))
        self.db.commit()

