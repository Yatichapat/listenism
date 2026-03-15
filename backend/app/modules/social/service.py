from sqlalchemy.orm import Session

from app.modules.social.repository import SocialRepository
from app.modules.social.schemas import ActionResponse, CommentRequest, FollowRequest, LikeRequest


class SocialService:
    def __init__(self, db: Session) -> None:
        self.repo = SocialRepository(db)

    def follow_artist(self, user_id: int, payload: FollowRequest) -> ActionResponse:
        self.repo.follow_artist(user_id, payload.artist_id)
        return ActionResponse(message="Followed artist")

    def like_song(self, user_id: int, payload: LikeRequest) -> ActionResponse:
        self.repo.like_song(user_id, payload.song_id)
        return ActionResponse(message="Liked song")

    def comment_song(self, user_id: int, payload: CommentRequest) -> ActionResponse:
        self.repo.comment_song(user_id, payload.song_id, payload.content)
        return ActionResponse(message="Comment added")
