from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy.orm import Session
from typing import List, cast, Any
from .. import models, schemas, database
from ..limiter import limiter
from ..auth import get_current_user, require_role
from ..services.s3 import s3_service
from ..worker import process_company_document
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/uploads",
    tags=["uploads"]
)

ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_FILE_SIZE = 25 * 1024 * 1024 # 25MB

# Magic-byte signature map — guards against extension spoofing (CWE-434)
ALLOWED_SIGNATURES = {
    "pdf": [b"%PDF"],
    "docx": [b"PK"],   # DOCX is a ZIP archive starting with PK
}


def get_file_extension(filename: str) -> str:
    return filename.split(".")[-1].lower() if "." in filename else ""


def _validate_file_signature(content: bytes, extension: str) -> bool:
    """Validate magic bytes match expected file signature for the extension."""
    signatures = ALLOWED_SIGNATURES.get(extension, [])
    if not signatures:
        return False
    return any(content.startswith(sig) for sig in signatures)


def _validate_mime_match(content: bytes, content_type: str, extension: str) -> bool:
    """Validate declared content_type is plausible for the file extension."""
    allowed = {
        "pdf": {"application/pdf", "application/x-pdf"},
        "docx": {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        },
    }
    expected = allowed.get(extension, set())
    # Accept both declared type and common alternatives
    if not expected:
        return True
    # content_type can be something like "application/pdf; charset=utf-8"
    base_type = content_type.split(";")[0].strip()
    if base_type not in expected:
        logger.warning(
            f"Content-Type '{base_type}' does not match extension '{extension}' — rejecting"
        )
        return False
    return True

@router.get("/documents", response_model=List[schemas.DocumentOut])
async def list_company_documents(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    docs = db.query(models.CompanyDocument).filter(
        models.CompanyDocument.organization_id == current_user.organization_id
    ).order_by(models.CompanyDocument.created_at.desc()).all()
    return docs

@router.post("/company-document", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_company_document(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_role([models.RoleEnum.ADMIN, models.RoleEnum.WRITER]))
):
    # SEC-3: Validate file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 25MB."
        )

    # BE-2: Validate extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )
    extension = get_file_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # HIGH-1: Validate magic bytes match expected signature for extension
    file.file.seek(0)
    header = file.file.read(8)
    file.file.seek(0)
    if not _validate_file_signature(header, extension):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match its declared extension (.{extension})"
        )

    # HIGH-1: Validate declared content-type is plausible for the extension
    if file.content_type and not _validate_mime_match(header, file.content_type, extension):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Declared content-type does not match file extension"
        )

    # Generate unique S3 key
    s3_key = f"org_{current_user.organization_id}/{uuid.uuid4()}.{extension}"

    # Upload to S3
    await s3_service.upload_fileobj(file, s3_key)

    # Save to DB
    new_doc = models.CompanyDocument(
        organization_id=current_user.organization_id,
        file_name=file.filename,
        s3_key=s3_key,
        content_type=file.content_type,
        status=models.DocumentStatus.PENDING
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Trigger background processing
    cast(Any, process_company_document).delay(new_doc.id)

    return new_doc
