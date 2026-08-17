# admin-service
Aggregates usage stats: user count, exports processed, storage consumed (FR-6.x).

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8007
```
