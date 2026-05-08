import pytest

def test_get_my_organization(authenticated_client, test_user):
    response = authenticated_client.get("/api/v1/organizations/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user.organization_id
    assert "name" in data
    assert "subscription_tier" in data
