# image-render-service
Async worker: composites final image/PDF from canvas JSON (FR-5.1).
Subscribes to Pub/Sub export-requests topic; writes result to GCS.

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8005
```
