FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

RUN useradd -m -u 1000 appuser && mkdir -p /data && chown -R appuser:appuser /data

COPY requirements.txt .
RUN pip install --default-timeout=1000 --retries=10 --no-cache-dir -r requirements.txt

COPY fonts ./fonts
COPY worker ./worker

USER appuser

EXPOSE 8080

CMD ["sh", "-c", "uvicorn worker.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
