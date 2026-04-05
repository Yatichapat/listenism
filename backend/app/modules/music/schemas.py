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
	audio_url: str | None = None
	cover_url: str | None = None
	view_count: int | None = None
	like_count: int | None = None


class SongListResponse(BaseModel):
	items: list[SongResponse]


class AlbumResponse(BaseModel):
	id: int
	title: str
	artist_name: str
	cover_url: str | None = None


class AlbumDetailResponse(AlbumResponse):
	songs: list[SongResponse]


class AlbumListResponse(BaseModel):
	items: list[AlbumResponse]


class ArtistResponse(BaseModel):
	id: int
	name: str
	followers_count: int | None = None
	avatar_url: str | None = None


class ArtistListResponse(BaseModel):
	items: list[ArtistResponse]


