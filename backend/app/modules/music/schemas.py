from pydantic import BaseModel


class SongCreateRequest(BaseModel):
	title: str
	artist_name: str
	genre: str | None = None


class SongResponse(BaseModel):
	id: int
	title: str
	artist_name: str
	genre: str | None = None


class SongListResponse(BaseModel):
	items: list[SongResponse]
