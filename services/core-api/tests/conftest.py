import os
import shutil
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure environment variables before importing app
tmp_storage = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LOCAL_STORAGE_DIR"] = tmp_storage
os.environ["QUEUE_BACKEND"] = "local"
os.environ["WORKER_URL"] = "http://localhost:8001"
os.environ["JWT_SECRET"] = "test-secret-key-12345"

from core_api.config import settings
settings.DATABASE_URL = "sqlite:///:memory:"
settings.LOCAL_STORAGE_DIR = tmp_storage
settings.QUEUE_BACKEND = "local"
settings.WORKER_URL = "http://localhost:8001"
settings.JWT_SECRET = "test-secret-key-12345"

from core_api.models import Base
from core_api.database import get_db, init_db
from core_api.main import app

from sqlalchemy.pool import StaticPool

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    from core_api.templates_seed import seed_templates
    db = TestingSessionLocal()
    seed_templates(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    shutil.rmtree(tmp_storage, ignore_errors=True)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
