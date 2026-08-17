# project-service
CRUD for design/video projects and metadata (FR-2.5, FR-3.x support).

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```
