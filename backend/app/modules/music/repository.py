from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from app.models.song import Song
from app.models.album import Album
from app.models.user import User, UserRole
from app.models.social import Follow, Like


class MusicRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_songs(self) -> list[Song]:
        return list(self.db.scalars(select(Song).order_by(Song.created_at.desc())))

    def list_newest_songs(self, limit: int = 10) -> list[Song]:
        return list(self.db.scalars(select(Song).order_by(Song.created_at.desc()).limit(limit)))

    def list_songs_by_artist(self, artist_id: int) -> list[Song]:
        stmt = select(Song).where(Song.artist_id == artist_id).order_by(Song.created_at.desc())
        return list(self.db.scalars(stmt))

    def list_hot_songs(self, limit: int = 10) -> list[Song]:
        # Sort by number of likes
        stmt = (
            select(Song)
            .outerjoin(Like, Like.song_id == Song.id)
            .group_by(Song.id)
            .order_by(desc(func.count(Like.id)), Song.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def list_newest_albums(self, limit: int = 10) -> list[Album]:
        return list(self.db.scalars(select(Album).order_by(Album.created_at.desc()).limit(limit)))

    def list_hot_artists(self, limit: int = 10) -> list[User]:
        # Artists with most followers
        stmt = (
            select(User)
            .outerjoin(Follow, Follow.artist_id == User.id)
            .where(User.role == UserRole.artist)
            .group_by(User.id)
            .order_by(desc(func.count(Follow.id)))
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def list_newest_artists(self, limit: int = 10) -> list[User]:
        # Artists ordered by their most recent song upload
        stmt = (
            select(User)
            .join(Song, Song.artist_id == User.id)
            .where(User.role == UserRole.artist)
            .group_by(User.id)
            .order_by(desc(func.max(Song.created_at)))
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def create_song(
        self,
        title: str,
        genre: str | None,
        artist_id: int,
        file_key: str | None = None,
        album_id: int | None = None,
    ) -> Song:
        song = Song(
            title=title,
            genre=genre,
            artist_id=artist_id,
            file_key=file_key,
            album_id=album_id,
        )
        self.db.add(song)
        self.db.commit()
        self.db.refresh(song)
        return song

    def get_or_create_album(self, title: str, artist_id: int, cover_url: str | None = None) -> Album:
        existing = self.db.scalar(
            select(Album).where(
                Album.artist_id == artist_id,
                func.lower(Album.title) == title.strip().lower(),
            )
        )
        if existing is not None:
            if cover_url and existing.cover_url != cover_url:
                existing.cover_url = cover_url
                self.db.add(existing)
                self.db.commit()
                self.db.refresh(existing)
            return existing

        album = Album(title=title.strip(), artist_id=artist_id, cover_url=cover_url)
        self.db.add(album)
        self.db.commit()
        self.db.refresh(album)
        return album

    def list_recommended_songs_for_user(self, user_id: int, limit: int = 10) -> list[Song]:
        genre_rows = self.db.execute(
            select(Song.genre, func.count(Like.id).label("likes_count"))
            .join(Like, Like.song_id == Song.id)
            .where(Like.user_id == user_id, Song.genre.is_not(None))
            .group_by(Song.genre)
            .order_by(desc("likes_count"))
            .limit(3)
        ).all()

        favorite_genres = [row[0] for row in genre_rows if row[0]]

        liked_song_ids_subquery = select(Like.song_id).where(Like.user_id == user_id)

        if not favorite_genres:
            stmt = (
                select(Song)
                .where(~Song.id.in_(liked_song_ids_subquery))
                .order_by(Song.created_at.desc())
                .limit(limit)
            )
            return list(self.db.scalars(stmt))

        stmt = (
            select(Song)
            .where(Song.genre.in_(favorite_genres), ~Song.id.in_(liked_song_ids_subquery))
            .order_by(Song.created_at.desc())
            .limit(limit)
        )
        songs = list(self.db.scalars(stmt))

        if len(songs) < limit:
            excluded_song_ids = [song.id for song in songs]
            excluded_song_ids.extend(
                song_id for song_id in self.db.scalars(liked_song_ids_subquery).all()
            )

            fill_stmt = (
                select(Song)
                .where(~Song.id.in_(excluded_song_ids) if excluded_song_ids else True)
                .order_by(Song.created_at.desc())
                .limit(limit - len(songs))
            )
            songs.extend(list(self.db.scalars(fill_stmt)))

        return songs

    def get_song_by_id(self, song_id: int) -> Song | None:
        return self.db.scalar(select(Song).where(Song.id == song_id))

    def delete_song(self, song: Song) -> None:
        self.db.delete(song)
        self.db.commit()
