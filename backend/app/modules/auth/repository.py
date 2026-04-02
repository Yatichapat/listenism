from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.modules.auth.schemas import UserPublic


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))

    def find_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

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
