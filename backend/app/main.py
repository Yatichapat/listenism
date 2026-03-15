from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.auth.router import router as auth_router
from app.modules.music.router import router as music_router
from app.modules.recommendation.router import router as recommendation_router
from app.modules.social.router import router as social_router
from app.shared.config import settings
from app.shared.exceptions import register_exception_handlers
from app.shared.logger import setup_logging

setup_logging()

app = FastAPI(title=settings.app_name, version=settings.app_version)
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}


app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(music_router, prefix="/api/v1/music", tags=["music"])
app.include_router(social_router, prefix="/api/v1/social", tags=["social"])
app.include_router(recommendation_router, prefix="/api/v1/recommendation", tags=["recommendation"])
