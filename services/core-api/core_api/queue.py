import base64
import json
import uuid
import httpx
from fastapi import BackgroundTasks
from core_api.config import settings
from core_api.logger import logger

def _send_local_push(job_id: str):
    data_str = json.dumps({"jobId": job_id})
    b64_data = base64.b64encode(data_str.encode("utf-8")).decode("utf-8")
    envelope = {
        "message": {
            "data": b64_data,
            "messageId": str(uuid.uuid4()),
        },
        "subscription": "local-export-sub"
    }
    target_url = f"{settings.WORKER_URL.rstrip('/')}/pubsub/push"
    try:
        logger.info(f"Dispatching export job {job_id} to worker at {target_url}")
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(target_url, json=envelope)
            logger.info(f"Worker push response for job {job_id}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to dispatch export job {job_id} to worker: {e}")

def publish_export_job(job_id: str, background_tasks: BackgroundTasks):
    if settings.QUEUE_BACKEND == "local":
        background_tasks.add_task(_send_local_push, job_id)
    else:
        # In GCP mode, publish to PubSub topic
        try:
            from google.cloud import pubsub_v1
            publisher = pubsub_v1.PublisherClient()
            data_bytes = json.dumps({"jobId": job_id}).encode("utf-8")
            publisher.publish(os.environ.get("PUBSUB_TOPIC", ""), data_bytes)
        except Exception as e:
            logger.error(f"Failed to publish to GCP Pub/Sub: {e}")
