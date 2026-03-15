from pydantic import BaseModel


class FollowRequest(BaseModel):
	artist_id: int


class LikeRequest(BaseModel):
	song_id: int


class CommentRequest(BaseModel):
	song_id: int
	content: str


class ActionResponse(BaseModel):
	success: bool = True
	message: str
