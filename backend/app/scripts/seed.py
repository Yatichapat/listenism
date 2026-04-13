from __future__ import annotations

from collections.abc import Iterable

from passlib.context import CryptContext
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.infrastructure.database import SessionLocal, create_all_tables
from app.models.album import Album
from app.models.social import Comment, Follow, Like
from app.models.song import Song
from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
DEFAULT_PASSWORD = "password123"


def _one_or_none(db: Session, stmt: Select[tuple[object]]) -> object | None:
    return db.execute(stmt).scalar_one_or_none()


def get_or_create_user(
    db: Session,
    *,
    email: str,
    display_name: str,
    role: UserRole,
    password: str = DEFAULT_PASSWORD,
) -> tuple[User, bool]:
    existing = _one_or_none(db, select(User).where(User.email == email))
    if isinstance(existing, User):
        return existing, False

    user = User(
        email=email,
        display_name=display_name,
        role=role,
        password_hash=pwd_context.hash(password),
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user, True


def get_or_create_song(
    db: Session,
    *,
    artist_id: int,
    title: str,
    genre: str | None,
    duration_seconds: int | None = None,
    file_key: str | None = None,
    album_id: int | None = None,
) -> tuple[Song, bool]:
    existing = _one_or_none(
        db,
        select(Song).where(Song.artist_id == artist_id, Song.title == title),
    )
    if isinstance(existing, Song):
        changed = False
        if file_key and not existing.file_key:
            existing.file_key = file_key
            changed = True
        if album_id is not None and existing.album_id is None:
            existing.album_id = album_id
            changed = True
        if changed:
            db.add(existing)
            db.flush()
        return existing, False

    song = Song(
        artist_id=artist_id,
        title=title,
        genre=genre,
        duration_seconds=duration_seconds,
        file_key=file_key,
        album_id=album_id,
    )
    db.add(song)
    db.flush()
    return song, True


def get_or_create_album(
    db: Session,
    *,
    artist_id: int,
    title: str,
    cover_url: str,
) -> tuple[Album, bool]:
    existing = _one_or_none(
        db,
        select(Album).where(Album.artist_id == artist_id, Album.title == title),
    )
    if isinstance(existing, Album):
        if not existing.cover_url:
            existing.cover_url = cover_url
            db.add(existing)
            db.flush()
        return existing, False

    album = Album(
        artist_id=artist_id,
        title=title,
        cover_url=cover_url,
    )
    db.add(album)
    db.flush()
    return album, True


def get_or_create_follow(db: Session, *, follower_id: int, artist_id: int) -> bool:
    existing = _one_or_none(
        db,
        select(Follow).where(Follow.follower_id == follower_id, Follow.artist_id == artist_id),
    )
    if isinstance(existing, Follow):
        return False

    db.add(Follow(follower_id=follower_id, artist_id=artist_id))
    db.flush()
    return True


def get_or_create_like(db: Session, *, user_id: int, song_id: int) -> bool:
    existing = _one_or_none(db, select(Like).where(Like.user_id == user_id, Like.song_id == song_id))
    if isinstance(existing, Like):
        return False

    db.add(Like(user_id=user_id, song_id=song_id))
    db.flush()
    return True


def get_or_create_comment(db: Session, *, user_id: int, song_id: int, content: str) -> bool:
    existing = _one_or_none(
        db,
        select(Comment).where(
            Comment.user_id == user_id,
            Comment.song_id == song_id,
            Comment.content == content,
        ),
    )
    if isinstance(existing, Comment):
        return False

    db.add(Comment(user_id=user_id, song_id=song_id, content=content))
    db.flush()
    return True


def _seed_users(db: Session) -> tuple[dict[str, User], int]:
    users: dict[str, User] = {}
    created = 0

    user_specs: Iterable[tuple[str, str, UserRole]] = [
        ("admin@listenism.local", "Listenism Admin", UserRole.admin),
        ("artist1@listenism.local", "Nina Nova", UserRole.artist),
        ("artist2@listenism.local", "Tee Rhythm", UserRole.artist),
        ("listener1@listenism.local", "Mali", UserRole.listener),
        ("listener2@listenism.local", "Peem", UserRole.listener),
    ]

    for email, display_name, role in user_specs:
        user, is_created = get_or_create_user(
            db,
            email=email,
            display_name=display_name,
            role=role,
        )
        users[email] = user
        if is_created:
            created += 1

    return users, created


def _seed_songs(db: Session, users: dict[str, User]) -> tuple[dict[str, Song], int, int]:
    songs: dict[str, Song] = {}
    created = 0
    albums_created = 0

    song_specs = [
        (
            "artist1@listenism.local",
            "Campus Sunset",
            "Lo-fi",
            201,
            "Study Sessions",
            "https://picsum.photos/seed/listenism-campus-sunset-cover/600/600",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        ),
        (
            "artist1@listenism.local",
            "Finals Week Rain",
            "Chillhop",
            188,
            "Study Sessions",
            "https://picsum.photos/seed/listenism-finals-rain-cover/600/600",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        ),
        (
            "artist2@listenism.local",
            "Night Bus",
            "Indie",
            216,
            "City Stories",
            "https://picsum.photos/seed/listenism-night-bus-cover/600/600",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        ),
        (
            "artist2@listenism.local",
            "Library Lights",
            "Acoustic",
            172,
            "City Stories",
            "https://picsum.photos/seed/listenism-library-lights-cover/600/600",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        ),
    ]

    for artist_email, title, genre, duration, album_title, cover_url, audio_url in song_specs:
        artist = users[artist_email]
        album, album_is_created = get_or_create_album(
            db,
            artist_id=artist.id,
            title=album_title,
            cover_url=cover_url,
        )
        if album_is_created:
            albums_created += 1

        song, is_created = get_or_create_song(
            db,
            artist_id=artist.id,
            title=title,
            genre=genre,
            duration_seconds=duration,
            file_key=audio_url,
            album_id=album.id,
        )
        songs[f"{artist_email}:{title}"] = song
        if is_created:
            created += 1

    return songs, created, albums_created


def seed() -> None:
    create_all_tables()

    with SessionLocal() as db:
        users, created_users = _seed_users(db)
        songs, created_songs, created_albums = _seed_songs(db, users)

        follows_created = 0
        follows_created += int(
            get_or_create_follow(
                db,
                follower_id=users["listener1@listenism.local"].id,
                artist_id=users["artist1@listenism.local"].id,
            )
        )
        follows_created += int(
            get_or_create_follow(
                db,
                follower_id=users["listener2@listenism.local"].id,
                artist_id=users["artist1@listenism.local"].id,
            )
        )
        follows_created += int(
            get_or_create_follow(
                db,
                follower_id=users["listener2@listenism.local"].id,
                artist_id=users["artist2@listenism.local"].id,
            )
        )

        likes_created = 0
        likes_created += int(
            get_or_create_like(
                db,
                user_id=users["listener1@listenism.local"].id,
                song_id=songs["artist1@listenism.local:Campus Sunset"].id,
            )
        )
        likes_created += int(
            get_or_create_like(
                db,
                user_id=users["listener1@listenism.local"].id,
                song_id=songs["artist2@listenism.local:Night Bus"].id,
            )
        )
        likes_created += int(
            get_or_create_like(
                db,
                user_id=users["listener2@listenism.local"].id,
                song_id=songs["artist1@listenism.local:Finals Week Rain"].id,
            )
        )

        comments_created = 0
        comments_created += int(
            get_or_create_comment(
                db,
                user_id=users["listener1@listenism.local"].id,
                song_id=songs["artist1@listenism.local:Campus Sunset"].id,
                content="Great vibe for late-night studying!",
            )
        )
        comments_created += int(
            get_or_create_comment(
                db,
                user_id=users["listener2@listenism.local"].id,
                song_id=songs["artist2@listenism.local:Library Lights"].id,
                content="Love this track. Super relaxing.",
            )
        )

        db.commit()

    print("Seed complete")
    print(f"- users created: {created_users}")
    print(f"- albums created: {created_albums}")
    print(f"- songs created: {created_songs}")
    print(f"- follows created: {follows_created}")
    print(f"- likes created: {likes_created}")
    print(f"- comments created: {comments_created}")
    print(f"- default password for seeded users: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    seed()
