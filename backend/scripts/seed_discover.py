import os
import sys

# Ensure the script can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from app.infrastructure.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.song import Song
from app.models.album import Album
from app.models.social import Follow, Like

def seed():
    # Make sure tables exist (they should, but just in case)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # We can either clear existing or append.
        # Let's append but only if our specific test users don't exist
        print("Seeding Discover page datasets...")

        # Create Artists
        artists_data = [
            {"email": "chillhop@example.com", "display_name": "Chillhop Producer", "role": UserRole.artist},
            {"email": "rockstar@example.com", "display_name": "Rock Star Demo", "role": UserRole.artist},
            {"email": "synthwave@example.com", "display_name": "Synthwave Master", "role": UserRole.artist},
            {"email": "acoustics@example.com", "display_name": "Acoustic Vibes", "role": UserRole.artist},
        ]
        
        artists = []
        for a_data in artists_data:
            user = db.query(User).filter_by(email=a_data["email"]).first()
            if not user:
                user = User(
                    email=a_data["email"],
                    display_name=a_data["display_name"],
                    password_hash="fake",
                    role=a_data["role"]
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            artists.append(user)

        # Create Albums
        albums_data = [
            {"title": "LoFi Study Sessions", "artist": artists[0], "cover_url": "https://picsum.photos/seed/album1/300/300"},
            {"title": "Midnight Drive", "artist": artists[2], "cover_url": "https://picsum.photos/seed/album2/300/300"},
            {"title": "Unplugged 2024", "artist": artists[3], "cover_url": "https://picsum.photos/seed/album3/300/300"},
        ]

        albums = []
        for alb_data in albums_data:
            album = db.query(Album).filter_by(title=alb_data["title"]).first()
            if not album:
                album = Album(
                    title=alb_data["title"],
                    artist_id=alb_data["artist"].id,
                    cover_url=alb_data["cover_url"]
                )
                db.add(album)
                db.commit()
                db.refresh(album)
            albums.append(album)

        # Create Songs
        songs_data = [
            {"title": "Morning Coffee", "genre": "Lo-fi", "artist": artists[0], "album": albums[0], "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
            {"title": "Night Focus", "genre": "Chillhop", "artist": artists[0], "album": albums[0], "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
            {"title": "Neon Lights", "genre": "Synthwave", "artist": artists[2], "album": albums[1], "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"},
            {"title": "Acoustic Sunset", "genre": "Acoustic", "artist": artists[3], "album": albums[2], "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"},
            {"title": "Rock Anthem", "genre": "Rock", "artist": artists[1], "album": None, "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"},
        ]

        # Avoid duplicates by checking title
        songs_to_insert = []
        for s_data in songs_data:
            song = db.query(Song).filter_by(title=s_data["title"]).first()
            if not song:
                song = Song(
                    title=s_data["title"],
                    genre=s_data["genre"],
                    artist_id=s_data["artist"].id,
                    album_id=s_data["album"].id if s_data["album"] else None,
                    file_key=s_data["url"]
                )
                db.add(song)
                db.commit()
                db.refresh(song)
                songs_to_insert.append(song)
            else:
                songs_to_insert.append(song)
        
        # Simulate follows for hot artists
        # Let's say we have listener users
        listener_emails = [f"fan{i}@example.com" for i in range(1, 10)]
        for email in listener_emails:
            user = db.query(User).filter_by(email=email).first()
            if not user:
                user = User(email=email, display_name=f"Fan {email.split('@')[0]}", password_hash="fake", role=UserRole.listener)
                db.add(user)
                db.commit()
            
            # Fan everyone a bit differently
            fan_user = db.query(User).filter_by(email=email).first()
            # Fan 1, 2, 3 fan chillhop
            if int(email.replace("fan", "").split("@")[0]) <= 5:
                # Add follow
                follow = db.query(Follow).filter_by(follower_id=fan_user.id, artist_id=artists[0].id).first()
                if not follow:
                    db.add(Follow(follower_id=fan_user.id, artist_id=artists[0].id))
            
            # Fan 1-8 fan synthwave
            if int(email.replace("fan", "").split("@")[0]) <= 8:
                follow = db.query(Follow).filter_by(follower_id=fan_user.id, artist_id=artists[2].id).first()
                if not follow:
                    db.add(Follow(follower_id=fan_user.id, artist_id=artists[2].id))
        
        # Simulate likes
        # Give Neon lights a lot of likes
        hot_song = db.query(Song).filter_by(title="Neon Lights").first()
        for i, email in enumerate(listener_emails):
            fan_user = db.query(User).filter_by(email=email).first()
            like = db.query(Like).filter_by(user_id=fan_user.id, song_id=hot_song.id).first()
            if not like:
                db.add(Like(user_id=fan_user.id, song_id=hot_song.id))
        
        db.commit()
        print("Seed completed.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
