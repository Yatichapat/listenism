from datetime import datetime

from pydantic import BaseModel


class FollowRequest(BaseModel):
	artist_id: int


class LikeRequest(BaseModel):
	song_id: int


class CommentRequest(BaseModel):
	song_id: int
	content: str


class CommentUpdateRequest(BaseModel):
	content: str


class CommentItem(BaseModel):
	id: int
	song_id: int
	user_id: int
	user_name: str
	content: str
	created_at: datetime | None = None


class CommentListResponse(BaseModel):
	items: list[CommentItem]


class SongReportRequest(BaseModel):
	song_id: int
	reason: str | None = None


class UserReportRequest(BaseModel):
	user_id: int
	reason: str | None = None


class SongReportItem(BaseModel):
	id: int
	song_id: int
	song_title: str
	reporter_id: int
	reporter_email: str
	reason: str | None = None
	created_at: datetime | None = None


class SongReportListResponse(BaseModel):
	items: list[SongReportItem]


class UserReportItem(BaseModel):
	id: int
	reported_user_id: int
	reported_user_email: str
	reporter_id: int
	reporter_email: str
	reason: str | None = None
	created_at: datetime | None = None


class UserReportListResponse(BaseModel):
	items: list[UserReportItem]


class ActionResponse(BaseModel):
	success: bool = True
	message: str
