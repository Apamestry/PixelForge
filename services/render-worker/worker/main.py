import base64
import json
import time
from typing import Dict, Any
from fastapi import FastAPI, Request, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError, DatabaseError

from worker.config import settings
from worker.database import SessionLocal
from worker.models import ExportJob, utc_now
from worker.storage import save_file
from worker.renderer import render_canvas, export_image
from worker.logger import logger

app = FastAPI(title="PixelForge Render Worker", version="1.0.0")

class PubSubMessage(BaseModel):
    data: str
    messageId: str = ""

class PubSubEnvelope(BaseModel):
    message: PubSubMessage
    subscription: str = ""

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.post("/pubsub/push")
def handle_pubsub_push(envelope: PubSubEnvelope):
    # Decode base64 message data
    try:
        raw_bytes = base64.b64decode(envelope.message.data)
        payload = json.loads(raw_bytes.decode("utf-8"))
        job_id = payload.get("jobId")
        if not job_id:
            logger.error("No jobId found in push payload")
            return {"status": "ignored", "reason": "no_job_id"}
    except Exception as e:
        logger.error(f"Failed to decode push message: {e}")
        # Permanent failure on malformed envelope -> return 200 so not retried indefinitely
        return {"status": "ignored", "reason": "malformed_envelope"}

    # Load job from database
    db = SessionLocal()
    try:
        job = db.query(ExportJob).filter(ExportJob.id == job_id).first()
        if not job:
            logger.warning(f"Job {job_id} not found in database")
            # Might be transient replication delay or bad id; return 200 if bad id
            return {"status": "ignored", "reason": "job_not_found"}

        # 1. Idempotency check
        if job.status in ("done", "failed"):
            logger.info(f"Job {job_id} is already {job.status}. Returning 200.")
            return {"status": "already_processed", "jobId": job_id}

        # 2. Set processing
        job.status = "processing"
        job.started_at = utc_now()
        db.commit()

        # Artificial delay for testing autoscaling
        if settings.RENDER_ARTIFICIAL_DELAY_SECONDS > 0:
            time.sleep(settings.RENDER_ARTIFICIAL_DELAY_SECONDS)

        # 3. Render
        canvas_snapshot = job.canvas_snapshot
        scale = job.scale or 1
        canvas = render_canvas(canvas_snapshot, scale=scale, db=db)

        # Export image
        fmt = job.format.lower()
        bg_hex = canvas_snapshot.get("background", "#FFFFFF")
        exported_bytes = export_image(canvas, fmt, background_hex=bg_hex)

        # Upload to users/{userId}/exports/{jobId}.{ext}
        ext = fmt
        if ext == "jpeg":
            ext = "jpg"
        output_key = f"users/{job.user_id}/exports/{job.id}.{ext}"
        save_file(output_key, exported_bytes)

        # Set done
        job.status = "done"
        job.output_key = output_key
        job.finished_at = utc_now()
        db.commit()
        logger.info(f"Export job {job_id} rendered and saved to {output_key}")
        return {"status": "success", "jobId": job_id, "outputKey": output_key}

    except (OperationalError, DatabaseError) as e:
        # Transient database failure -> return 500 for retry
        logger.error(f"Transient database error processing job {job_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transient database failure"
        )
    except Exception as e:
        # Permanent failure (bad canvas, render exception, etc.)
        logger.error(f"Permanent error processing job {job_id}: {e}")
        try:
            db.rollback()
            job = db.query(ExportJob).filter(ExportJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.error = str(e)
                job.finished_at = utc_now()
                db.commit()
        except Exception as db_err:
            logger.error(f"Failed to record job failure: {db_err}")
        return {"status": "failed", "jobId": job_id, "error": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("worker.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
