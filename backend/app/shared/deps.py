from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.models.user import User
from app.shared.config import settings
from app.shared.exceptions import AppException

bearer_scheme = HTTPBearer(auto_error=False)


def db_session(db: Session = Depends(get_db)) -> Session:
	return db


def current_user_id(
	credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
	db: Session = Depends(get_db),
) -> int:
	if credentials is None:
		raise AppException("Not authenticated", status_code=401)

	token = credentials.credentials
	try:
		payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
	except JWTError as exc:
		raise AppException("Invalid or expired token", status_code=401) from exc

	subject = payload.get("sub")
	if subject is None:
		raise AppException("Invalid token payload", status_code=401)

	try:
		user_id = int(subject)
	except ValueError as exc:
		raise AppException("Invalid token subject", status_code=401) from exc

	user_exists = db.scalar(select(User.id).where(User.id == user_id, User.is_active.is_(True)))
	if user_exists is None:
		raise AppException("User not found", status_code=401)

	return user_id
