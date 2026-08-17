# auth-service
Registration, login, Google OAuth, JWT issuance/refresh (FR-1.x in BRD).

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
