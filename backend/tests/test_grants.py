import pytest
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app import models

client = TestClient(app)

def test_search_grants_unauthorized():
    # Verify that a request without authentication returns 401
    response = client.post("/api/v1/grants/search", json={"query": "GreenTech"})
    assert response.status_code == 401

def test_search_grants_sql_fallback(db_session, authenticated_client):
    # Setup test grants in DB
    grant1 = models.Grant(
        external_id="EE-001",
        title="Green Energy Innovation Grant",
        description="Funding for circular energy and solar panels.",
        deadline=datetime(2026, 7, 12, 17, 0, tzinfo=timezone.utc),
        funding_range="€50,000 - €200,000",
        eligibility_criteria="SMEs registered under European jurisdiction",
        source_url="https://example.com/grant1",
        sector_tags='["GreenTech", "ESG"]'
    )
    grant2 = models.Grant(
        external_id="EE-002",
        title="SaaS Growth Fund",
        description="Accelerate SaaS development and cloud systems.",
        deadline=datetime(2026, 8, 20, 17, 0, tzinfo=timezone.utc),
        funding_range="€10,000 - €50,000",
        eligibility_criteria="Tech startups",
        source_url="https://example.com/grant2",
        sector_tags='["SaaS", "Enterprise"]'
    )
    db_session.add(grant1)
    db_session.add(grant2)
    db_session.commit()

    # Search for Green Energy (SQL matching)
    response = authenticated_client.post(
        "/api/v1/grants/search",
        json={"query": "Green Energy", "limit": 10}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Green Energy Innovation Grant"

    # Search with sector filter
    response = authenticated_client.post(
        "/api/v1/grants/search",
        json={"query": "", "sectors": ["SaaS"], "limit": 10}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "SaaS" in data[0]["sector_tags"]

def test_search_grants_vector_success(db_session, authenticated_client):
    # Setup test grants in DB
    grant1 = models.Grant(
        external_id="EE-003",
        title="DeepTech AI Innovation",
        description="AI models research and deployment.",
        deadline=datetime(2026, 12, 31, 23, 59, tzinfo=timezone.utc),
        funding_range="€100,000 - €500,000",
        eligibility_criteria="Advanced AI researchers",
        source_url="https://example.com/grant3",
        sector_tags='["AI", "DeepTech"]'
    )
    db_session.add(grant1)
    db_session.commit()

    # Mock Vector Service to return the grant's ID
    with patch("app.routers.grants.vector_service.query_grants") as mock_query:
        mock_query.return_value = [grant1.id]

        response = authenticated_client.post(
            "/api/v1/grants/search",
            json={"query": "advanced intelligence models", "limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == grant1.id
        assert data[0]["title"] == "DeepTech AI Innovation"
        mock_query.assert_called_once_with("advanced intelligence models", limit=10)

def test_get_grant_by_id(db_session, authenticated_client):
    grant = models.Grant(
        external_id="EE-004",
        title="Estonian Quantum Initiative",
        description="Quantum key distribution research fund.",
        deadline=datetime(2026, 10, 10, 17, 0, tzinfo=timezone.utc),
        funding_range="€500,000",
        eligibility_criteria="Research institutes",
        source_url="https://example.com/grant4",
        sector_tags='["Quantum", "DeepTech"]'
    )
    db_session.add(grant)
    db_session.commit()

    # Get valid grant
    response = authenticated_client.get(f"/api/v1/grants/{grant.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Estonian Quantum Initiative"

    # Get non-existent grant
    response = authenticated_client.get("/api/v1/grants/9999")
    assert response.status_code == 404
