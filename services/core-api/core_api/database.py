from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from core_api.config import settings
from core_api.models import Base
from core_api.logger import logger

connect_args = {}
engine_kwargs = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    engine_kwargs.update({
        "pool_size": 3,
        "max_overflow": 2,
        "pool_pre_ping": True,
    })

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized.")
    from core_api.templates_seed import seed_templates
    db = SessionLocal()
    try:
        seed_templates(db)
    finally:
        db.close()
