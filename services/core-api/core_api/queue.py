"""
Queue abstraction for core-api.

QUEUE_BACKEND=local   -> POST the Pub/Sub envelope directly to WORKER_URL in a background task
QUEUE_BACKEND=pubsub  -> publish {jobId} to the real Google Cloud Pub/Sub topic PUBSUB_TOPIC

Why Pub/Sub publishing is NOT a background task: Cloud Run throttles CPU once the HTTP response
has been sent, so work done after the response can stall or be lost. We publish before responding
and return 503 if the queue is unavailable, so a job never sits in "queued" with nothing behind it.
"""

import base64
import json
import uuid
from functools import lru_cache

import httpx
from fastapi import BackgroundTasks, HTTPException

from core_api.config import settings
from core_api.logger import logger


def _send_local_push(job_id: str) -> None:
    """Directly POST the Pub/Sub envelope to the worker (local-dev only)."""
    data_str = json.dumps({"jobId": job_id})
    b64_data = base64.b64encode(data_str.encode("utf-8")).decode("utf-8")
    envelope = {
        "message": {
            "data": b64_data,
            "messageId": str(uuid.uuid4()),
        },
        "subscription": "local-export-sub",
    }
    target_url = f"{settings.WORKER_URL.rstrip('/')}/pubsub/push"
    try:
        logger.info(f"Dispatching export job {job_id} to worker at {target_url}")
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(target_url, json=envelope)
            logger.info(f"Worker push response for job {job_id}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to dispatch export job {job_id} to worker: {e}")


@lru_cache(maxsize=1)
def _publisher():
    """One publisher client per instance (creating one per request is slow)."""
    from google.cloud import pubsub_v1  # type: ignore

    return pubsub_v1.PublisherClient()


def _publish_pubsub(job_id: str) -> None:
    """Publish {jobId} to the configured Pub/Sub topic and wait for the ack. Raises on failure."""
    data_bytes = json.dumps({"jobId": job_id}).encode("utf-8")
    msg_id = _publisher().publish(settings.PUBSUB_TOPIC, data_bytes).result(timeout=15)
    logger.info(f"Published job {job_id} to Pub/Sub, message id: {msg_id}")


def publish_export_job(job_id: str, background_tasks: BackgroundTasks) -> None:
    if settings.QUEUE_BACKEND == "pubsub":
        try:
            _publish_pubsub(job_id)
        except Exception as e:
            logger.error(f"Failed to publish job {job_id} to Pub/Sub: {e}")
            raise HTTPException(status_code=503, detail="Export queue unavailable, please retry")
    else:
        background_tasks.add_task(_send_local_push, job_id)
