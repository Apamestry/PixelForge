from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False)
    project_id = Column(String(36), nullable=False)
    format = Column(String(10), nullable=False)
    scale = Column(Integer, nullable=False, default=1)
    canvas_snapshot = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False)
    error = Column(Text, nullable=True)
    output_key = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    storage_key = Column(String(512), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
