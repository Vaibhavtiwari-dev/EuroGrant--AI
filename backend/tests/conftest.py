import pytest
import os
import uuid
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.auth import get_current_user
from app import models

# Use a file-based SQLite for tests on Windows to avoid in-memory issues with multiple connections
TEST_DB_FILE = "test_worker.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def create_test_db():
    # Import all models to ensure they are registered with Base.metadata
    from app import models
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    Base.metadata.create_all(bind=engine)
    yield
    # On Windows, we might have file locks, so we don't remove here.
    # It will be removed at the start of the next run if it exists.

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def mock_s3():
    # Use AsyncMock for async function
    mock = AsyncMock()
    from app.services.s3 import s3_service
    old_upload = s3_service.upload_fileobj
    s3_service.upload_fileobj = mock
    yield mock
    s3_service.upload_fileobj = old_upload

@pytest.fixture
def mock_worker():
    mock = MagicMock()
    from app.worker import process_company_document
    old_delay = process_company_document.delay
    process_company_document.delay = mock
    yield mock
    process_company_document.delay = old_delay

@pytest.fixture
def test_user(db_session):
    unique_id = str(uuid.uuid4())[:8]
    org = models.Organization(name=f"Test Org {unique_id}", subscription_tier="growth")
    db_session.add(org)
    db_session.commit()
    
    user = models.User(
        email=f"test_{unique_id}@example.com",
        full_name="Test User",
        hashed_password="hashed_password",
        role=models.RoleEnum.ADMIN,
        organization_id=org.id
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(org)
    return user

@pytest.fixture
def authenticated_client(test_user):
    def override_get_current_user():
        return test_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    from fastapi.testclient import TestClient
    client = TestClient(app)
    yield client
    del app.dependency_overrides[get_current_user]
