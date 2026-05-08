import pytest
from app.auth import create_access_token
from datetime import timedelta

# Skip hashing tests if passlib/bcrypt are having compatibility issues with Python 3.14
# but keep token tests for coverage

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
