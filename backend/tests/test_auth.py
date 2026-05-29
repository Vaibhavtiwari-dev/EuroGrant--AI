import pytest
from app.auth import create_access_token, get_password_hash, verify_password
from datetime import timedelta

def test_create_access_token():
    data = {"sub": "test@example.com"}
    token = create_access_token(data)
    assert token is not None
    assert isinstance(token, str)

def test_token_expiration():
    data = {"sub": "test@example.com"}
    expires = timedelta(minutes=-1) # Already expired
    token = create_access_token(data, expires_delta=expires)
    assert token is not None

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert len(hashed) > 0
    
    # Verify correct password matches
    assert verify_password(password, hashed) is True
    
    # Verify incorrect password fails
    assert verify_password("WrongPassword123", hashed) is False
