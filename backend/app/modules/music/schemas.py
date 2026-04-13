from pydantic import BaseModel, Field
from datetime import datetime


class SongCreateRequest(BaseModel):
	title: str
	artist_name: str
	genre: str | None = None


class SongUpdateRequest(BaseModel):
	title: str | None = None
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


class ActionResponse(BaseModel):
	message: str


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


class SearchResultsResponse(BaseModel):
	query: str
	songs: list[SongResponse] = Field(default_factory=list)
	albums: list[AlbumResponse] = Field(default_factory=list)
	artists: list[ArtistResponse] = Field(default_factory=list)


class SongPlayStat(BaseModel):
	id: int
	title: str
	genre: str | None = None
	play_count: int = 0
	like_count: int = 0


class ArtistAnalyticsResponse(BaseModel):
	artist_id: int
	artist_name: str
	follower_count: int = 0
	total_songs: int = 0
	total_plays: int = 0
	top_songs: list[SongPlayStat] = Field(default_factory=list)


class PlaylistCreateRequest(BaseModel):
	name: str


class PlaylistRenameRequest(BaseModel):
	name: str


class PlaylistAddSongRequest(BaseModel):
	song_id: int


class PlaylistSongResponse(SongResponse):
	position: int


class PlaylistResponse(BaseModel):
	id: int
	user_id: int
	name: str
	created_at: datetime | None = None
	songs: list[PlaylistSongResponse] = Field(default_factory=list)


class PlaylistListResponse(BaseModel):
	items: list[PlaylistResponse]


