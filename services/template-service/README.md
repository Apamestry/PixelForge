# template-service
Serves curated templates, cached via Redis (FR-4.2).

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8004
```
