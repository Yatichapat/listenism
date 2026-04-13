from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.user import UserRole
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AdminUserItem, AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, UserListResponse, UserPublic
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

    def _ensure_admin_role(self, user_id: int) -> None:
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise AppException("User not found", status_code=404)
        if user.role != UserRole.admin:
            raise AppException("Admin access required", status_code=403)

    def list_users(self, admin_id: int) -> UserListResponse:
        self._ensure_admin_role(admin_id)
        users = self.repo.list_users()
        like_counts = self.repo.like_counts_by_user()
        follower_counts = self.repo.follower_counts_by_user()

        items = [
            AdminUserItem(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                role=user.role.value if isinstance(user.role, UserRole) else str(user.role),
                like_count=like_counts.get(user.id, 0),
                follower_count=follower_counts.get(user.id, 0),
            )
            for user in users
        ]
        return UserListResponse(items=items)

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

        access_token = self._create_access_token(subject=str(user.id))
        refresh_token = self._create_refresh_token(subject=str(user.id))
        return AuthResponse(access_token=access_token, refresh_token=refresh_token)

    def refresh(self, payload: RefreshRequest) -> AuthResponse:
        user_id = self._decode_refresh_token(payload.refresh_token)
        user = self.repo.get_by_id(user_id)
        if user is None:
            raise AppException("User not found", status_code=401)

        access_token = self._create_access_token(subject=str(user.id))
        refresh_token = self._create_refresh_token(subject=str(user.id))
        return AuthResponse(access_token=access_token, refresh_token=refresh_token)

    def _create_access_token(self, subject: str) -> str:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
        return self._create_token(subject=subject, expires_delta=expires_delta, token_type="access")

    def _create_refresh_token(self, subject: str) -> str:
        expires_delta = timedelta(days=settings.refresh_token_expire_days)
        return self._create_token(subject=subject, expires_delta=expires_delta, token_type="refresh")

    def _create_token(self, subject: str, expires_delta: timedelta, token_type: str) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": subject,
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
            "type": token_type,
        }
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    def _decode_refresh_token(self, token: str) -> int:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        except JWTError as exc:
            raise AppException("Invalid or expired refresh token", status_code=401) from exc

        if payload.get("type") != "refresh":
            raise AppException("Invalid refresh token", status_code=401)

        subject = payload.get("sub")
        if subject is None:
            raise AppException("Invalid refresh token payload", status_code=401)

        try:
            return int(subject)
        except ValueError as exc:
            raise AppException("Invalid refresh token subject", status_code=401) from exc
