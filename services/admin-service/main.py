"""
admin-service — FastAPI entrypoint
Run locally: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI

app = FastAPI(title="admin-service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "admin-service"}
