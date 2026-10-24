import copy
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from core_api.database import get_db
from core_api.models import ExportJob, Project, User
from core_api.schemas import ExportCreateRequest, ExportResponse
from core_api.auth import get_current_user
from core_api.storage import generate_signed_url
from core_api.queue import publish_export_job

router = APIRouter(prefix="/exports", tags=["exports"])

@router.post("", response_model=ExportResponse, status_code=status.HTTP_202_ACCEPTED)
def create_export(
    req: ExportCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == req.projectId,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    canvas_snapshot = copy.deepcopy(project.canvas)

    job = ExportJob(
        user_id=current_user.id,
        project_id=project.id,
        format=req.format,
        scale=req.scale,
        canvas_snapshot=canvas_snapshot,
        status="queued"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Publish export job
    publish_export_job(job.id, background_tasks)

    return ExportResponse(
        id=job.id,
        status=job.status,
        format=job.format,
        created_at=job.created_at
    )

@router.get("/{job_id}", response_model=ExportResponse)
def get_export(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ExportJob).filter(
        ExportJob.id == job_id,
        ExportJob.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")

    download_url = None
    if job.status == "done" and job.output_key:
        download_url = generate_signed_url(job.output_key)

    return ExportResponse(
        id=job.id,
        status=job.status,
        format=job.format,
        error=job.error,
        downloadUrl=download_url,
        created_at=job.created_at
    )

@router.get("", response_model=List[ExportResponse])
def list_exports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    jobs = db.query(ExportJob).filter(
        ExportJob.user_id == current_user.id
    ).order_by(ExportJob.created_at.desc()).all()

    result = []
    for job in jobs:
        download_url = None
        if job.status == "done" and job.output_key:
            download_url = generate_signed_url(job.output_key)
        result.append(
            ExportResponse(
                id=job.id,
                status=job.status,
                format=job.format,
                error=job.error,
                downloadUrl=download_url,
                created_at=job.created_at
            )
        )
    return result
