from typing import List, Dict
import copy
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core_api.database import get_db
from core_api.models import Project, Template, Asset, User
from core_api.schemas import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    CanvasJSON
)
from core_api.auth import get_current_user
from core_api.storage import generate_signed_url

router = APIRouter(prefix="/projects", tags=["projects"])

def get_project_asset_urls(canvas: dict, db: Session, user_id: str) -> Dict[str, str]:
    asset_urls = {}
    elements = canvas.get("elements", [])
    asset_ids = [el.get("assetId") for el in elements if el.get("type") == "image" and el.get("assetId")]
    if asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids), Asset.user_id == user_id).all()
        for a in assets:
            asset_urls[a.id] = generate_signed_url(a.storage_key)
    return asset_urls

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.updated_at.desc()).all()
    return projects

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    req: ProjectCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.templateId:
        tpl = db.query(Template).filter(Template.id == req.templateId).first()
        if not tpl:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        canvas = copy.deepcopy(tpl.canvas)
    else:
        w = req.width or 1080
        h = req.height or 1080
        canvas = {
            "version": 1,
            "width": w,
            "height": h,
            "background": "#FFFFFF",
            "elements": []
        }

    # Validate canvas
    CanvasJSON.model_validate(canvas)

    project = Project(
        user_id=current_user.id,
        name=req.name,
        canvas=canvas
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    project_resp = ProjectResponse.model_validate(project)
    project_resp.assetUrls = get_project_asset_urls(project.canvas, db, current_user.id)
    return project_resp

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project_resp = ProjectResponse.model_validate(project)
    project_resp.assetUrls = get_project_asset_urls(project.canvas, db, current_user.id)
    return project_resp

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    req: ProjectUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if req.name is not None:
        project.name = req.name

    if req.canvas is not None:
        # Validate canvas against Section 3 rules (max 4000x4000, max 200 elements)
        CanvasJSON.model_validate(req.canvas)
        project.canvas = req.canvas

    db.commit()
    db.refresh(project)

    project_resp = ProjectResponse.model_validate(project)
    project_resp.assetUrls = get_project_asset_urls(project.canvas, db, current_user.id)
    return project_resp

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db.delete(project)
    db.commit()
    return None
