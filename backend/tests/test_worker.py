import pytest
import json
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_s3_service():
    with patch("app.services.s3.s3_service.get_fileobj", return_value=b"fake content"):
        yield

@pytest.fixture
def mock_extraction():
    mock_text = MagicMock(return_value="Extracted text")
    mock_redact = MagicMock(return_value="Safe text")
    with patch("app.services.extraction.extraction_service.extract_text", mock_text), \
         patch("app.services.extraction.redact_pii", mock_redact):
        yield {"text": mock_text, "redact": mock_redact}


def test_process_company_document_success(db_session, mock_s3_service, mock_extraction):
    from app.worker import process_company_document
    from app import models

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

    mock_vector = MagicMock()
    mock_extract = MagicMock()

    with patch("app.services.vector_db.get_vector_service", return_value=mock_vector), \
         patch("app.worker.extract_company_profile", mock_extract):
        process_company_document(doc.id)

        db_session.expire_all()
        updated_doc = db_session.query(models.CompanyDocument).filter(models.CompanyDocument.id == doc.id).first()
        assert updated_doc.status == models.DocumentStatus.PROCESSED
        assert mock_vector.upsert_text.called
        assert mock_extract.called


def test_extract_company_profile(db_session):
    from app.worker import extract_company_profile
    from app import models

    org = models.Organization(name="Profile Org")
    db_session.add(org)
    db_session.commit()

    mock_response = MagicMock()
    mock_response.choices[0].message.content = json.dumps({
        "sector": "Tech",
        "headcount_range": "11-50",
        "revenue_tier": "1M-5M",
        "legal_entity_type": "GmbH",
        "countries_of_operation": ["Germany"],
        "core_technologies": ["Python"]
    })

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch("app.worker._get_openai_client", return_value=mock_client):
        extract_company_profile("Document text", org.id, db_session)

        db_session.expire_all()
        updated_org = db_session.query(models.Organization).filter(models.Organization.id == org.id).first()
        assert updated_org.sector == "Tech"
        assert updated_org.headcount_range == "11-50"
        assert updated_org.revenue_tier == "1M-5M"
        assert updated_org.legal_entity_type == "GmbH"