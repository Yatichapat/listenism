from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.user import UserRole
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, UserPublic
from app.shared.config import settings
from app.shared.exceptions import AppException

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repo = AuthRepository(db)

    def me(self, user_id: int) -> UserPublic:
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise AppException("User not found", status_code=404)
        like_count = len(user.likes) if hasattr(user, 'likes') else 0
        follower_count = len(user.followers) if hasattr(user, 'followers') else 0
        # Convert enum to string properly
        role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)
        return UserPublic(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=role_str,
            like_count=like_count,
            follower_count=follower_count,
        )

    def register(self, payload: RegisterRequest) -> UserPublic:
        if self.repo.find_by_email(payload.email):
            raise AppException("Email already exists", status_code=409)
        password_hash = pwd_context.hash(payload.password)
        try:
            role = UserRole(payload.role)
        except ValueError:
            raise AppException(f"Invalid role: {payload.role}", status_code=400)
        return self.repo.create_user(
            email=payload.email,
            display_name=payload.display_name,
            password_hash=password_hash,
            role=role,
        )

    def login(self, payload: LoginRequest) -> AuthResponse:
        user = self.repo.find_by_email(payload.email)
        if not user or not pwd_context.verify(payload.password, user.password_hash):
            raise AppException("Invalid credentials", status_code=401)

        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = self._create_access_token(subject=str(user.id), expires_delta=expires_delta)
        return AuthResponse(access_token=access_token)

    def _create_access_token(self, subject: str, expires_delta: timedelta) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": subject,
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
        }
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
