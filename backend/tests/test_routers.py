from fastapi.testclient import TestClient
from app.main import app
import pytest
import os
import uuid
from unittest.mock import patch

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_pwd_context():
    with patch("app.auth.pwd_context") as mock:
        mock.hash.side_effect = lambda x: f"hashed_{x}"
        mock.verify.side_effect = lambda p, h: h == f"hashed_{p}"
        yield mock

def test_auth_login_invalid():
    # Test login with invalid credentials
    # The app returns 403 Forbidden for invalid credentials in app/routers/auth.py
    response = client.post("/api/v1/auth/login", data={"username": "wrong@example.com", "password": "wrongpassword"})
    assert response.status_code == 403
    assert "detail" in response.json()

def test_auth_register_success(db_session):
    unique_id = str(uuid.uuid4())[:8]
    payload = {
        "email": f"new_{unique_id}@example.com",
        "password": "password123",
        "full_name": "New User",
        "organization_name": f"New Org {unique_id}",
        "invite_code": os.getenv("MASTER_INVITE_CODE", "testcode")
    }
    # Ensure MASTER_INVITE_CODE is set for tests
    os.environ["MASTER_INVITE_CODE"] = "testcode"
    
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["role"] == "admin" # First user in org should be admin

def test_auth_register_duplicate_email(db_session):
    unique_id = str(uuid.uuid4())[:8]
    email = f"dup_{unique_id}@example.com"
    payload = {
        "email": email,
        "password": "password123",
        "full_name": "User 1",
        "organization_name": f"Org {unique_id}",
        "invite_code": os.getenv("MASTER_INVITE_CODE", "testcode")
    }
    os.environ["MASTER_INVITE_CODE"] = "testcode"
    
    # First registration
    client.post("/api/v1/auth/register", json=payload)
    
    # Second registration with same email
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_auth_login_success(db_session):
    unique_id = str(uuid.uuid4())[:8]
    email = f"user_{unique_id}@example.com"
    password = "password123"
    
    # Register first
    os.environ["MASTER_INVITE_CODE"] = "testcode"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "User",
        "organization_name": f"Org {unique_id}",
        "invite_code": "testcode"
    })
    
    # Now login
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_organizations_me_unauthorized():
    response = client.get("/api/v1/organizations/me")
    assert response.status_code == 401
