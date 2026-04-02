"""
FastAPI app entrypoint for Listenism ML service.
"""
from fastapi import FastAPI
from .router import router

app = FastAPI(title="Listenism ML Service", version="0.1.0")
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}
