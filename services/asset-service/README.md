# asset-service
Upload handling, signed GCS URL generation, thumbnailing (FR-4.x).

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```
