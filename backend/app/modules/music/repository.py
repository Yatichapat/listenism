from sqlalchemy import select, func, desc, delete
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload, selectinload

from app.models.song import Song
from app.models.album import Album
from app.models.playlist import Playlist, PlaylistSong
from app.models.user import User, UserRole
from app.models.social import Comment, Follow, Like, ListenEvent


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

    def list_liked_songs_for_user(self, user_id: int) -> list[Song]:
        stmt = (
            select(Song)
            .join(Like, Like.song_id == Song.id)
            .where(Like.user_id == user_id)
            .order_by(Like.created_at.desc(), Song.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def list_feed_songs_for_user(self, user_id: int, limit: int = 20) -> list[Song]:
        stmt = (
            select(Song)
            .join(Follow, Follow.artist_id == Song.artist_id)
            .where(Follow.follower_id == user_id)
            .order_by(Song.created_at.desc())
            .limit(limit)
        )
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
        stmt = (
            select(Album)
            .join(Song, Song.album_id == Album.id)
            .group_by(Album.id)
            .order_by(Album.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def get_album_by_id(self, album_id: int) -> Album | None:
        stmt = (
            select(Album)
            .options(
                joinedload(Album.artist),
                selectinload(Album.songs).joinedload(Song.artist),
            )
            .where(Album.id == album_id)
        )
        return self.db.scalar(stmt)

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

    def update_song(self, song: Song, *, title: str | None = None, genre: str | None = None) -> Song:
        if title is not None:
            song.title = title
        if genre is not None:
            song.genre = genre
        self.db.add(song)
        self.db.commit()
        self.db.refresh(song)
        return song

    def update_album_cover(self, album: Album, cover_url: str) -> Album:
        album.cover_url = cover_url
        self.db.add(album)
        self.db.commit()
        self.db.refresh(album)
        return album

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

    def create_playlist(self, user_id: int, name: str) -> Playlist:
        playlist = Playlist(user_id=user_id, name=name.strip())
        self.db.add(playlist)
        self.db.commit()
        self.db.refresh(playlist)
        return self.get_playlist_by_id_for_user(playlist.id, user_id) or playlist

    def list_playlists_for_user(self, user_id: int) -> list[Playlist]:
        stmt = (
            select(Playlist)
            .where(Playlist.user_id == user_id)
            .options(selectinload(Playlist.songs).joinedload(PlaylistSong.song).joinedload(Song.artist), selectinload(Playlist.songs).joinedload(PlaylistSong.song).joinedload(Song.album))
            .order_by(Playlist.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_playlist_by_id_for_user(self, playlist_id: int, user_id: int) -> Playlist | None:
        stmt = (
            select(Playlist)
            .where(Playlist.id == playlist_id, Playlist.user_id == user_id)
            .options(selectinload(Playlist.songs).joinedload(PlaylistSong.song).joinedload(Song.artist), selectinload(Playlist.songs).joinedload(PlaylistSong.song).joinedload(Song.album))
        )
        return self.db.scalar(stmt)

    def rename_playlist(self, playlist: Playlist, new_name: str) -> Playlist:
        playlist.name = new_name.strip()
        self.db.add(playlist)
        self.db.commit()
        self.db.refresh(playlist)
        return self.get_playlist_by_id_for_user(playlist.id, playlist.user_id) or playlist

    def delete_playlist(self, playlist: Playlist) -> None:
        self.db.execute(delete(Playlist).where(Playlist.id == playlist.id))
        self.db.commit()

    def add_song_to_playlist(self, playlist: Playlist, song_id: int) -> PlaylistSong:
        existing = self.db.scalar(
            select(PlaylistSong).where(
                PlaylistSong.playlist_id == playlist.id,
                PlaylistSong.song_id == song_id,
            )
        )
        if existing is not None:
            return existing

        max_position = self.db.scalar(
            select(func.max(PlaylistSong.position)).where(PlaylistSong.playlist_id == playlist.id)
        )
        next_position = int(max_position or 0) + 1

        playlist_song = PlaylistSong(playlist_id=playlist.id, song_id=song_id, position=next_position)
        self.db.add(playlist_song)
        self.db.commit()
        self.db.refresh(playlist_song)
        return playlist_song

    def remove_song_from_playlist(self, playlist: Playlist, song_id: int) -> bool:
        playlist_song = self.db.scalar(
            select(PlaylistSong).where(
                PlaylistSong.playlist_id == playlist.id,
                PlaylistSong.song_id == song_id,
            )
        )
        if playlist_song is None:
            return False

        removed_position = playlist_song.position
        self.db.execute(
            delete(PlaylistSong).where(
                PlaylistSong.playlist_id == playlist.id,
                PlaylistSong.song_id == song_id,
            )
        )

        trailing_entries = list(
            self.db.scalars(
                select(PlaylistSong)
                .where(
                    PlaylistSong.playlist_id == playlist.id,
                    PlaylistSong.position > removed_position,
                )
                .order_by(PlaylistSong.position.asc())
            )
        )
        for entry in trailing_entries:
            entry.position -= 1
            self.db.add(entry)

        self.db.commit()
        return True

    def count_songs_in_album(self, album_id: int) -> int:
        return int(self.db.scalar(select(func.count(Song.id)).where(Song.album_id == album_id)) or 0)

    def delete_album_by_id(self, album_id: int) -> None:
        self.db.execute(delete(Album).where(Album.id == album_id))
        self.db.commit()

    def cleanup_empty_albums(self) -> int:
        empty_album_ids = list(
            self.db.scalars(
                select(Album.id)
                .outerjoin(Song, Song.album_id == Album.id)
                .group_by(Album.id)
                .having(func.count(Song.id) == 0)
            )
        )

        if not empty_album_ids:
            return 0

        self.db.execute(delete(Album).where(Album.id.in_(empty_album_ids)))
        self.db.commit()
        return len(empty_album_ids)

    def delete_song(self, song: Song) -> None:
        self.db.execute(delete(ListenEvent).where(ListenEvent.song_id == song.id))
        self.db.execute(delete(Comment).where(Comment.song_id == song.id))
        self.db.execute(delete(Like).where(Like.song_id == song.id))
        self.db.execute(delete(Song).where(Song.id == song.id))
        self.db.commit()

    def create_listen_event(self, user_id: int, song_id: int) -> None:
        self.db.add(ListenEvent(user_id=user_id, song_id=song_id))
        self.db.commit()

    def get_artist_analytics(self, artist_id: int) -> dict[str, object]:
        total_songs = int(self.db.scalar(select(func.count(Song.id)).where(Song.artist_id == artist_id)) or 0)
        total_followers = int(self.db.scalar(select(func.count(Follow.id)).where(Follow.artist_id == artist_id)) or 0)
        total_plays = int(
            self.db.scalar(
                select(func.count(ListenEvent.id))
                .select_from(ListenEvent)
                .join(Song, Song.id == ListenEvent.song_id)
                .where(Song.artist_id == artist_id)
            )
            or 0
        )

        play_count_subquery = (
            select(func.count(ListenEvent.id))
            .where(ListenEvent.song_id == Song.id)
            .correlate(Song)
            .scalar_subquery()
        )
        like_count_subquery = (
            select(func.count(Like.id))
            .where(Like.song_id == Song.id)
            .correlate(Song)
            .scalar_subquery()
        )

        top_song_rows = self.db.execute(
            select(
                Song.id,
                Song.title,
                Song.genre,
                play_count_subquery.label("play_count"),
                like_count_subquery.label("like_count"),
            )
            .where(Song.artist_id == artist_id)
            .order_by(desc(play_count_subquery), desc(like_count_subquery), Song.created_at.desc())
            .limit(10)
        ).all()

        return {
            "artist_id": artist_id,
            "artist_name": self.db.scalar(select(User.display_name).where(User.id == artist_id)) or "",
            "follower_count": total_followers,
            "total_songs": total_songs,
            "total_plays": total_plays,
            "top_songs": [
                {
                    "id": song_id,
                    "title": title,
                    "genre": genre,
                    "play_count": int(play_count or 0),
                    "like_count": int(like_count or 0),
                }
                for song_id, title, genre, play_count, like_count in top_song_rows
            ],
        }

    def list_genre_fallback_songs_for_new_user(self, limit: int = 10) -> list[Song]:
        top_genres = [
            genre
            for genre in self.db.scalars(
                select(Song.genre)
                .where(Song.genre.is_not(None))
                .group_by(Song.genre)
                .order_by(desc(func.count(Song.id)))
                .limit(3)
            ).all()
            if genre
        ]

        if not top_genres:
            return list(self.db.scalars(select(Song).order_by(Song.created_at.desc()).limit(limit)))

        songs = list(
            self.db.scalars(
                select(Song)
                .where(Song.genre.in_(top_genres))
                .order_by(Song.created_at.desc())
                .limit(limit)
            )
        )

        if len(songs) < limit:
            existing_ids = [song.id for song in songs]
            fill_stmt = select(Song).order_by(Song.created_at.desc()).limit(limit - len(songs))
            if existing_ids:
                fill_stmt = fill_stmt.where(~Song.id.in_(existing_ids))
            songs.extend(list(self.db.scalars(fill_stmt)))

        return songs
