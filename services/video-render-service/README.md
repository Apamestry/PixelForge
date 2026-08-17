# video-render-service
Async worker: trims, merges, overlays, transcodes video via FFmpeg (FR-3.x, FR-5.2).
Longer jobs may run as Cloud Run Jobs instead of a standard service.

## Run locally
Requires ffmpeg installed on the system (`apt install ffmpeg` / `brew install ffmpeg`).
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8006
```
