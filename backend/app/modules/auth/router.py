from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, UserPublic
from app.modules.auth.service import AuthService
from app.shared.deps import current_user_id

router = APIRouter()


@router.post("/register", response_model=UserPublic)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserPublic:
    return AuthService(db).register(payload)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return AuthService(db).login(payload)


@router.get("/me", response_model=UserPublic)
def me(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
) -> UserPublic:
    return AuthService(db).me(user_id)


