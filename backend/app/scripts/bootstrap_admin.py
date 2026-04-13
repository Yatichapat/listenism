from __future__ import annotations

import os

from passlib.context import CryptContext
from sqlalchemy import select

from app.infrastructure.database import SessionLocal
from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def bootstrap_admin() -> None:
    enabled = _as_bool(os.getenv("ADMIN_BOOTSTRAP_ENABLED"), default=True)
    if not enabled:
        print("Admin bootstrap disabled (ADMIN_BOOTSTRAP_ENABLED=false).")
        return

    email = (os.getenv("ADMIN_EMAIL") or "admin@listenism.local").strip()
    password = (os.getenv("ADMIN_PASSWORD") or "admin123").strip()
    display_name = (os.getenv("ADMIN_DISPLAY_NAME") or "Listenism Admin").strip()

    if not email or not password:
        print("Admin bootstrap skipped: missing ADMIN_EMAIL or ADMIN_PASSWORD.")
        return

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))

        if user is None:
            user = User(
                email=email,
                display_name=display_name,
                password_hash=pwd_context.hash(password),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(user)
            db.commit()
            print(f"Created admin user: {email}")
            return

        changed = False
        if user.role != UserRole.admin:
            user.role = UserRole.admin
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True
        if display_name and user.display_name != display_name:
            user.display_name = display_name
            changed = True

        reset_password = _as_bool(os.getenv("ADMIN_RESET_PASSWORD"), default=False)
        if reset_password:
            user.password_hash = pwd_context.hash(password)
            changed = True

        if changed:
            db.add(user)
            db.commit()
            print(f"Updated admin user: {email}")
        else:
            print(f"Admin user already ready: {email}")


if __name__ == "__main__":
    bootstrap_admin()
