from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..limiter import limiter
from ..auth import get_current_user, require_role
from ..services.s3 import s3_service
from ..worker import process_company_document
import uuid

router = APIRouter(
    prefix="/uploads",
    tags=["uploads"]
)

ALLOWED_EXTENSIONS = {"pdf", "docx"}
MAX_FILE_SIZE = 25 * 1024 * 1024 # 25MB

def get_file_extension(filename: str) -> str:
    return filename.split(".")[-1].lower() if "." in filename else ""

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
    extension = get_file_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
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
    process_company_document.delay(new_doc.id)

    return new_doc
