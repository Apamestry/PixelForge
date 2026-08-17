"""
image-render-service — FastAPI entrypoint
Run locally: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI

app = FastAPI(title="image-render-service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "image-render-service"}
