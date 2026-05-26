import pytest
from app.services.extraction import ExtractionService, redact_pii

def test_redact_pii():
    text = "My email is test@example.com and my name is John Doe."
    redacted = redact_pii(text)
    assert "test@example.com" not in redacted
    assert "[REDACTED_EMAIL]" in redacted

def test_extract_text_pdf_invalid():
    # Test that it logs error and raises exception for invalid PDF
    service = ExtractionService()
    with pytest.raises(Exception):
        service.extract_text(b"some invalid content", "application/pdf")

def test_extract_text_unsupported():
    service = ExtractionService()
    text = service.extract_text(b"some content", "text/plain")
    assert text == ""

def test_vector_service_upsert_grant():
    from app.services.vector_db import vector_service
    from unittest.mock import MagicMock, patch
    
    # Mock index
    mock_index = MagicMock()
    
    with patch.object(vector_service, "index", mock_index), \
         patch.object(vector_service, "generate_embeddings", return_value=[0.1] * 1536) as mock_embed:
         
        metadata = {"title": "Test Grant", "funding_range": "10k-50k"}
        vector_service.upsert_grant(
            grant_id=42,
            text="This is a test grant description that should be embedded and indexed.",
            metadata=metadata
        )
        
        # Verify generate_embeddings was called
        assert mock_embed.called
        
        # Verify upsert was called
        assert mock_index.upsert.called
        
        # Check call arguments
        args, kwargs = mock_index.upsert.call_args
        assert kwargs["namespace"] == "grants"
        vectors = kwargs["vectors"]
        assert len(vectors) > 0
        assert vectors[0]["id"].startswith("grant_42_chunk_")
        assert vectors[0]["values"] == [0.1] * 1536
        assert vectors[0]["metadata"]["grant_id"] == 42
        assert vectors[0]["metadata"]["title"] == "Test Grant"
        assert "text" in vectors[0]["metadata"]


def test_vector_service_search_grants_success():
    from app.services.vector_db import vector_service
    from unittest.mock import MagicMock, patch

    # Mock index and mock response
    mock_index = MagicMock()
    mock_response = {
        "matches": [
            {
                "id": "grant_10_chunk_0",
                "score": 0.95,
                "metadata": {
                    "grant_id": 10,
                    "text": "This is a real matching grant description",
                    "title": "Real Test Grant"
                }
            }
        ]
    }
    mock_index.query.return_value = mock_response

    with patch.object(vector_service, "index", mock_index), \
         patch.object(vector_service, "generate_embeddings", return_value=[0.1] * 1536) as mock_embed:
         
        results = vector_service.search_grants(query_text="real query", top_k=2)
        
        # Verify embeddings were generated
        mock_embed.assert_called_once_with("real query")
        
        # Verify query was called with correct parameters
        mock_index.query.assert_called_once_with(
            vector=[0.1] * 1536,
            top_k=2,
            namespace="grants",
            include_metadata=True
        )
        
        # Verify results mapping
        assert len(results) == 1
        assert results[0]["id"] == "grant_10_chunk_0"
        assert results[0]["score"] == 0.95
        assert results[0]["grant_id"] == 10
        assert results[0]["text"] == "This is a real matching grant description"
        assert results[0]["title"] == "Real Test Grant"


def test_vector_service_search_grants_fallback_uninitialized():
    from app.services.vector_db import vector_service
    from unittest.mock import patch
    
    with patch.object(vector_service, "index", None):
        results = vector_service.search_grants(query_text="fallback query", top_k=2)
        
        # Should return mock results up to top_k
        assert len(results) == 2
        assert results[0]["grant_id"] == 1
        assert results[1]["grant_id"] == 2


def test_vector_service_search_grants_fallback_exception():
    from app.services.vector_db import vector_service
    from unittest.mock import MagicMock, patch
    
    mock_index = MagicMock()
    mock_index.query.side_effect = Exception("Pinecone failure")
    
    with patch.object(vector_service, "index", mock_index), \
         patch.object(vector_service, "generate_embeddings", return_value=[0.1] * 1536):
         
        results = vector_service.search_grants(query_text="fallback query", top_k=1)
        
        # Should catch exception and return mock results
        assert len(results) == 1
        assert results[0]["grant_id"] == 1


def test_notification_service_local_mode():
    from app.services.notifications import NotificationService
    from unittest.mock import patch

    with patch.dict("os.environ", {"NOTIFICATION_BACKEND": "local"}):
        service = NotificationService()
        assert not service.use_ses
        assert service.client is None
        
        # Test sending alert in local mode
        success = service.send_match_alert("test@example.com", "Test Grant", 0.85, "Explanation text")
        assert success is True


def test_notification_service_ses_mode_success():
    from app.services.notifications import NotificationService
    from unittest.mock import MagicMock, patch

    mock_client = MagicMock()
    mock_client.send_email.return_value = {"MessageId": "12345"}

    with patch.dict("os.environ", {
        "NOTIFICATION_BACKEND": "ses",
        "AWS_ACCESS_KEY_ID": "real_key",
        "AWS_SECRET_ACCESS_KEY": "real_secret",
        "AWS_SES_REGION": "us-east-1",
        "SES_SENDER_EMAIL": "sender@example.com"
    }):
        with patch("boto3.client", return_value=mock_client) as mock_boto3:
            service = NotificationService()
            assert service.use_ses
            assert service.client is not None
            mock_boto3.assert_called_once_with(
                "ses",
                aws_access_key_id="real_key",
                aws_secret_access_key="real_secret",
                region_name="us-east-1"
            )

            success = service.send_match_alert("user@example.com", "Test Grant", 0.9, "Matches perfectly")
            assert success is True
            assert mock_client.send_email.called
            args, kwargs = mock_client.send_email.call_args
            assert kwargs["Source"] == "sender@example.com"
            assert kwargs["Destination"]["ToAddresses"] == ["user@example.com"]
            assert "Test Grant" in kwargs["Message"]["Subject"]["Data"]


def test_notification_service_ses_mode_failure_fallback():
    from app.services.notifications import NotificationService
    from botocore.exceptions import ClientError
    from unittest.mock import MagicMock, patch

    mock_client = MagicMock()
    mock_client.send_email.side_effect = ClientError(
        error_response={"Error": {"Code": "MessageRejected", "Message": "Email address not verified"}},
        operation_name="SendEmail"
    )

    with patch.dict("os.environ", {
        "NOTIFICATION_BACKEND": "ses",
        "AWS_ACCESS_KEY_ID": "real_key",
        "AWS_SECRET_ACCESS_KEY": "real_secret"
    }):
        with patch("boto3.client", return_value=mock_client):
            service = NotificationService()
            assert service.use_ses
            
            # Should catch ClientError, log it, and return True as fallback
            success = service.send_match_alert("user@example.com", "Test Grant", 0.9, "Matches perfectly")
            assert success is True

