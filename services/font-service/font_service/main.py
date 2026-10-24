import json
import logging
import os
import re
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from font_service.catalog import FONT_CATALOG, FONT_PAIRINGS

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"
FILENAME_REGEX = re.compile(r"^[A-Za-z0-9_-]+\.ttf$")

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "service": "font-service",
            "request_id": getattr(record, "request_id", ""),
        }
        return json.dumps(log_obj)

logger = logging.getLogger("font-service")
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

app = FastAPI(title="PixelForge Font Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/fonts/list")
def list_fonts():
    return FONT_CATALOG

@app.get("/fonts/pairings")
def list_pairings():
    return FONT_PAIRINGS

@app.api_route("/fonts/files/{filename}", methods=["GET", "HEAD"])
def get_font_file(filename: str):
    # Reject path traversal (.. / \ null bytes etc.)
    if not FILENAME_REGEX.match(filename) or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename"
        )

    file_path = (FONTS_DIR / filename).resolve()
    # Confirm it remains strictly within FONTS_DIR
    if not str(file_path).startswith(str(FONTS_DIR.resolve())):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid path"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Font file not found"
        )

    headers = {
        "Cache-Control": "public, max-age=31536000, immutable"
    }

    return FileResponse(
        path=str(file_path),
        media_type="font/ttf",
        filename=filename,
        headers=headers
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("font_service.main:app", host="0.0.0.0", port=port, reload=True)
