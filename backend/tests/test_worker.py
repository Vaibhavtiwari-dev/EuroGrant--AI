import pytest
from unittest.mock import MagicMock, patch
from app.worker import process_company_document, extract_company_profile
from app import models

def test_process_company_document_success(db_session, mock_s3):
    # Setup test data
    org = models.Organization(name="Worker Org")
    db_session.add(org)
    db_session.commit()
    
    doc = models.CompanyDocument(
        organization_id=org.id,
        file_name="test.pdf",
        s3_key="key",
        content_type="application/pdf",
        status=models.DocumentStatus.PENDING
    )
    db_session.add(doc)
    db_session.commit()
    
    # Mock services
    with patch("app.worker.s3_service.get_fileobj", return_value=b"fake content"):
        with patch("app.worker.extraction_service.extract_text", return_value="Extracted text"), \
             patch("app.worker.redact_pii", return_value="Safe text"), \
             patch("app.worker.vector_service.upsert_text") as mock_vector, \
             patch("app.worker.extract_company_profile") as mock_extract:
            
            # Use a separate session for the worker but shared DB (via StaticPool in engine)
            # We don't patch SessionLocal to return db_session, we let it create its own.
            # But we need to make sure app.worker.SessionLocal uses our test engine.
            from tests.conftest import TestingSessionLocal
            with patch("app.worker.SessionLocal", TestingSessionLocal):
                process_company_document(doc.id)
                
                # Re-fetch doc using the test's db_session
                db_session.expire_all()
                updated_doc = db_session.query(models.CompanyDocument).filter(models.CompanyDocument.id == doc.id).first()
                assert updated_doc.status == models.DocumentStatus.PROCESSED
                assert mock_vector.called
                assert mock_extract.called

def test_extract_company_profile(db_session):
    org = models.Organization(name="Profile Org")
    db_session.add(org)
    db_session.commit()
    
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"sector": "Tech", "headcount_range": "11-50", "revenue_tier": "1M-5M", "legal_entity_type": "GmbH", "countries_of_operation": ["Germany"], "core_technologies": ["Python"]}'
    
    with patch("app.worker.openai_client.chat.completions.create", return_value=mock_response):
        extract_company_profile("Document text", org.id, db_session)
        
        db_session.expire_all()
        updated_org = db_session.query(models.Organization).filter(models.Organization.id == org.id).first()
        assert updated_org.sector == "Tech"
        assert updated_org.headcount_range == "11-50"
        assert updated_org.revenue_tier == "1M-5M"
        assert updated_org.legal_entity_type == "GmbH"


def test_scan_for_new_matches_success(db_session):
    from app.worker import scan_for_new_matches
    
    # 1. Setup Organization, User, and Grant
    org = models.Organization(
        name="Scan Success Org",
        alert_email_enabled=True,
        match_threshold=0.8
    )
    db_session.add(org)
    db_session.commit()
    
    user = models.User(
        email="scan_success_user@example.com",
        full_name="Scan Success User",
        hashed_password="password",
        is_active=True,
        organization_id=org.id
    )
    db_session.add(user)
    
    grant = models.Grant(
        external_id="ext_success_grant",
        title="Success Grant Opportunity",
        description="This is a green tech grant for SaaS companies.",
        deadline=None,
        funding_range="100k",
        eligibility_criteria="SaaS companies",
        scoring_rubric="N/A",
        source_url="http://example.com/grant"
    )
    db_session.add(grant)
    db_session.commit()
    
    # Refresh to get IDs
    db_session.refresh(org)
    db_session.refresh(grant)
    
    # Mock services
    mock_search = MagicMock(return_value=[
        {"score": 0.85, "grant_id": grant.id}
    ])
    mock_explain = MagicMock(return_value="Synergy in SaaS and green tech.")
    mock_send = MagicMock(return_value=True)
    
    from tests.conftest import TestingSessionLocal
    
    with patch("app.worker.vector_service.search_grants", mock_search), \
         patch("app.worker.extraction_service.explain_match", mock_explain), \
         patch("app.worker.notification_service.send_match_alert", mock_send), \
         patch("app.worker.SessionLocal", TestingSessionLocal):
         
        scan_for_new_matches()
        
        # Verify notifications sent and DB record created
        db_session.expire_all()
        
        # Check that mock_send was called with our expected email and parameters
        matching_calls = [
            call for call in mock_send.call_args_list
            if call.kwargs.get("email") == "scan_success_user@example.com"
        ]
        assert len(matching_calls) == 1
        assert matching_calls[0].kwargs.get("grant_title") == "Success Grant Opportunity"
        assert matching_calls[0].kwargs.get("score") == 0.85
        assert matching_calls[0].kwargs.get("explanation") == "Synergy in SaaS and green tech."
        
        match_record = db_session.query(models.GrantMatch).filter(
            models.GrantMatch.organization_id == org.id,
            models.GrantMatch.grant_id == grant.id
        ).first()
        
        assert match_record is not None
        assert match_record.score == 0.85
        assert match_record.explanation == "Synergy in SaaS and green tech."
        assert match_record.alert_sent is True


def test_scan_for_new_matches_below_threshold(db_session):
    from app.worker import scan_for_new_matches
    
    # 1. Setup Organization, User, and Grant
    org = models.Organization(
        name="Scan Threshold Org",
        alert_email_enabled=True,
        match_threshold=0.8
    )
    db_session.add(org)
    db_session.commit()
    
    user = models.User(
        email="scan_thresh_user@example.com",
        full_name="Scan Thresh User",
        hashed_password="password",
        is_active=True,
        organization_id=org.id
    )
    db_session.add(user)
    
    grant = models.Grant(
        external_id="ext_thresh_grant",
        title="Thresh Grant Opportunity",
        description="This is a low match grant.",
        deadline=None,
        funding_range="10k",
        eligibility_criteria="N/A",
        scoring_rubric="N/A",
        source_url="http://example.com/grant2"
    )
    db_session.add(grant)
    db_session.commit()
    
    db_session.refresh(org)
    db_session.refresh(grant)
    
    mock_search = MagicMock(return_value=[
        {"score": 0.75, "grant_id": grant.id}
    ])
    mock_send = MagicMock()
    
    from tests.conftest import TestingSessionLocal
    
    with patch("app.worker.vector_service.search_grants", mock_search), \
         patch("app.worker.notification_service.send_match_alert", mock_send), \
         patch("app.worker.SessionLocal", TestingSessionLocal):
         
        scan_for_new_matches()
        
        # Verify no email sent for this specific user
        assert not any(
            call.kwargs.get("email") == "scan_thresh_user@example.com"
            for call in mock_send.call_args_list
        )
        
        match_record = db_session.query(models.GrantMatch).filter(
            models.GrantMatch.organization_id == org.id,
            models.GrantMatch.grant_id == grant.id
        ).first()
        assert match_record is None or match_record.alert_sent is False


def test_scan_for_new_matches_disabled(db_session):
    from app.worker import scan_for_new_matches
    
    # 1. Setup Organization with email disabled
    org = models.Organization(
        name="Scan Disabled Org",
        alert_email_enabled=False,
        match_threshold=0.5
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    
    mock_search = MagicMock()
    
    from tests.conftest import TestingSessionLocal
    
    with patch("app.worker.vector_service.search_grants", mock_search), \
         patch("app.worker.SessionLocal", TestingSessionLocal):
         
        scan_for_new_matches()
        
        # Verify search was not called for the disabled organization
        for call in mock_search.call_args_list:
            args, kwargs = call
            if args:
                assert "Scan Disabled Org" not in args[0]
            elif "query_text" in kwargs:
                assert "Scan Disabled Org" not in kwargs["query_text"]


