import pytest
from io import BytesIO

def test_list_documents(authenticated_client):
    response = authenticated_client.get("/api/v1/uploads/documents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_upload_document_success(authenticated_client, mock_s3, mock_worker):
    file_content = b"fake pdf content"
    file_name = "test.pdf"
    file = (BytesIO(file_content), file_name)
    
    response = authenticated_client.post(
        "/api/v1/uploads/company-document",
        files={"file": (file_name, file_content, "application/pdf")}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["file_name"] == file_name
    assert data["status"] == "pending"
    
    # Verify S3 upload and Worker trigger
    assert mock_s3.called
    assert mock_worker.called

def test_upload_document_invalid_extension(authenticated_client):
    file_content = b"fake text content"
    file_name = "test.txt"
    
    response = authenticated_client.post(
        "/api/v1/uploads/company-document",
        files={"file": (file_name, file_content, "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]

def test_upload_document_too_large(authenticated_client):
    # MAX_FILE_SIZE is 25MB
    large_content = b"a" * (26 * 1024 * 1024)
    file_name = "large.pdf"
    
    response = authenticated_client.post(
        "/api/v1/uploads/company-document",
        files={"file": (file_name, large_content, "application/pdf")}
    )
    
    assert response.status_code == 400
    assert "File too large" in response.json()["detail"]
