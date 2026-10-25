from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core_api.database import get_db
from core_api.models import User, ExportJob
from core_api.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return total users and total exports. Any authenticated user is allowed (SPEC §5)."""
    users = db.query(User).count()
    exports = db.query(ExportJob).count()
    return {"users": users, "exports": exports}
