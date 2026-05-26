import pytest
from unittest.mock import MagicMock, patch
from app import models, schemas
from app.services.extraction import ExtractionService

def test_explain_match_success():
    # Test explain_match calls openai and returns the message content
    service = ExtractionService()
    
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "Matches because sector is green tech."
    
    with patch.object(service.openai_client.chat.completions, "create", return_value=mock_response) as mock_create:
        explanation = service.explain_match("SaaS and GreenTech", "Green Tech grant details")
        assert explanation == "Matches because sector is green tech."
        mock_create.assert_called_once()
        args, kwargs = mock_create.call_args
        assert "gpt-4o-mini" in kwargs["model"]
        assert "SaaS and GreenTech" in kwargs["messages"][0]["content"]

def test_explain_match_truncation():
    # Test that explanation longer than 250 characters is truncated
    service = ExtractionService()
    
    mock_response = MagicMock()
    long_explanation = "A" * 300
    mock_response.choices[0].message.content = long_explanation
    
    with patch.object(service.openai_client.chat.completions, "create", return_value=mock_response):
        explanation = service.explain_match("SaaS", "Grant")
        assert len(explanation) <= 250
        assert explanation.endswith("...")

def test_explain_match_fallback():
    # Test that explanation falls back gracefully on error
    service = ExtractionService()
    
    with patch.object(service.openai_client.chat.completions, "create", side_effect=Exception("OpenAI down")):
        explanation = service.explain_match("SaaS", "Grant")
        assert explanation == "Potential match based on sector alignment."

def test_get_grant_matches_success(authenticated_client, test_user, db_session):
    # Seed a Grant in database
    grant = models.Grant(
        id=101,
        external_id="TEST-GRANT-101",
        title="Test Grant 101",
        description="A cool grant",
        eligibility_criteria="Everyone",
        sector_tags='["SaaS"]'
    )
    db_session.add(grant)
    db_session.commit()
    
    # Mock vector service search results
    mock_matches = [
        {"id": "grant_101_chunk_0", "score": 0.85, "grant_id": 101, "text": "A cool grant", "title": "Test Grant 101"}
    ]
    
    mock_openai_response = MagicMock()
    mock_openai_response.choices[0].message.content = "Fits the SaaS sector requirement perfectly."
    
    # Configure org details
    org = db_session.query(models.Organization).filter(models.Organization.id == test_user.organization_id).first()
    org.sector = "SaaS"
    org.match_threshold = 0.7
    db_session.commit()
    
    with patch("app.routers.grants.vector_service.search_grants", return_value=mock_matches) as mock_search, \
         patch("app.routers.grants.extraction_service.openai_client.chat.completions.create", return_value=mock_openai_response) as mock_ai:
         
        response = authenticated_client.get("/api/v1/grants/matches")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert len(data) == 1
        assert data[0]["grant_id"] == 101
        assert data[0]["score"] == 0.85
        assert data[0]["explanation"] == "Fits the SaaS sector requirement perfectly."
        assert data[0]["grant"]["title"] == "Test Grant 101"
        
        mock_search.assert_called_once()
        assert "SaaS" in mock_search.call_args[1]["query_text"]
        mock_ai.assert_called_once()
        
        # Verify it was saved to DB
        db_session.expire_all()
        db_match = db_session.query(models.GrantMatch).filter(
            models.GrantMatch.organization_id == test_user.organization_id,
            models.GrantMatch.grant_id == 101
        ).first()
        assert db_match is not None
        assert db_match.score == 0.85
        assert db_match.explanation == "Fits the SaaS sector requirement perfectly."

def test_get_grant_matches_caching(authenticated_client, test_user, db_session):
    # Seed Grant and pre-cached GrantMatch
    grant = models.Grant(
        id=102,
        external_id="TEST-GRANT-102",
        title="Test Grant 102",
        description="A cool grant 102",
        eligibility_criteria="Everyone",
        sector_tags='["SaaS"]'
    )
    db_session.add(grant)
    db_session.commit()
    
    cached_match = models.GrantMatch(
        organization_id=test_user.organization_id,
        grant_id=102,
        score=0.88,
        explanation="Pre-existing explanation",
        alert_sent=False
    )
    db_session.add(cached_match)
    db_session.commit()
    
    mock_matches = [
        {"id": "grant_102_chunk_0", "score": 0.90, "grant_id": 102, "text": "A cool grant 102", "title": "Test Grant 102"}
    ]
    
    with patch("app.routers.grants.vector_service.search_grants", return_value=mock_matches), \
         patch("app.routers.grants.extraction_service.openai_client.chat.completions.create") as mock_ai:
         
        response = authenticated_client.get("/api/v1/grants/matches")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 1
        assert data[0]["grant_id"] == 102
        assert data[0]["score"] == 0.90
        assert data[0]["explanation"] == "Pre-existing explanation" # kept from cache
        
        # Verify explanation was NOT generated again
        mock_ai.assert_not_called()
        
        # Verify score was updated in DB
        db_session.expire_all()
        db_match = db_session.query(models.GrantMatch).filter(models.GrantMatch.id == cached_match.id).first()
        assert db_match.score == 0.90

def test_get_grant_matches_threshold_filtering(authenticated_client, test_user, db_session):
    # Seed Grant
    grant = models.Grant(
        id=103,
        external_id="TEST-GRANT-103",
        title="Test Grant 103",
        description="A cool grant 103",
        eligibility_criteria="Everyone",
        sector_tags='["SaaS"]'
    )
    db_session.add(grant)
    
    org = db_session.query(models.Organization).filter(models.Organization.id == test_user.organization_id).first()
    org.match_threshold = 0.90
    db_session.commit()
    
    mock_matches = [
        {"id": "grant_103_chunk_0", "score": 0.85, "grant_id": 103, "text": "A cool grant 103", "title": "Test Grant 103"}
    ]
    
    with patch("app.routers.grants.vector_service.search_grants", return_value=mock_matches):
        response = authenticated_client.get("/api/v1/grants/matches")
        assert response.status_code == 200
        data = response.json()
        # Should be empty because score 0.85 < threshold 0.90
        assert len(data) == 0

def test_get_grant_matches_unauthorized():
    from fastapi.testclient import TestClient
    from app.main import app
    unauth_client = TestClient(app)
    response = unauth_client.get("/api/v1/grants/matches")
    assert response.status_code == 401

def test_patch_settings_admin(authenticated_client, test_user, db_session):
    test_user.role = models.RoleEnum.ADMIN
    db_session.commit()
    
    payload = {"match_threshold": 0.82, "alert_email_enabled": False}
    response = authenticated_client.patch("/api/v1/grants/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["match_threshold"] == 0.82
    assert data["alert_email_enabled"] is False
    
    db_session.expire_all()
    org = db_session.query(models.Organization).filter(models.Organization.id == test_user.organization_id).first()
    assert org.match_threshold == 0.82
    assert org.alert_email_enabled is False

def test_patch_settings_writer(authenticated_client, test_user, db_session):
    test_user.role = models.RoleEnum.WRITER
    db_session.commit()
    
    payload = {"match_threshold": 0.65}
    response = authenticated_client.patch("/api/v1/grants/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["match_threshold"] == 0.65
    
    db_session.expire_all()
    org = db_session.query(models.Organization).filter(models.Organization.id == test_user.organization_id).first()
    assert org.match_threshold == 0.65

def test_patch_settings_viewer_forbidden(authenticated_client, test_user, db_session):
    test_user.role = models.RoleEnum.VIEWER
    db_session.commit()
    
    payload = {"match_threshold": 0.65}
    response = authenticated_client.patch("/api/v1/grants/settings", json=payload)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]

def test_patch_settings_unauthorized():
    from fastapi.testclient import TestClient
    from app.main import app
    unauth_client = TestClient(app)
    response = unauth_client.patch("/api/v1/grants/settings", json={"match_threshold": 0.65})
    assert response.status_code == 401
