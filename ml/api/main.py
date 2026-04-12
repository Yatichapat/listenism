"""
FastAPI app entrypoint for Listenism ML service.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from scheduler import start_scheduler, stop_scheduler
from .router import router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()


app = FastAPI(title="Listenism ML Service", version="0.1.0", lifespan=lifespan)
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}
