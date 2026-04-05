from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.social import Follow, Like
from app.models.user import User, UserRole
from app.modules.auth.schemas import UserPublic


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))

    def find_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def list_users(self) -> list[User]:
        return list(self.db.scalars(select(User).order_by(User.created_at.desc())))

    def like_counts_by_user(self) -> dict[int, int]:
        rows = self.db.execute(
            select(Like.user_id, func.count(Like.id)).group_by(Like.user_id)
        ).all()
        return {user_id: int(count) for user_id, count in rows}

    def follower_counts_by_user(self) -> dict[int, int]:
        rows = self.db.execute(
            select(Follow.artist_id, func.count(Follow.id)).group_by(Follow.artist_id)
        ).all()
        return {artist_id: int(count) for artist_id, count in rows}

    def delete_user(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()

    def create_user(
        self,
        email: str,
        display_name: str,
        password_hash: str,
        role: UserRole = UserRole.listener,
    ) -> UserPublic:
        user = User(
            email=email,
            display_name=display_name,
            password_hash=password_hash,
            role=role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)
        return UserPublic(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=role_str,
            like_count=0,
            follower_count=0,
        )
