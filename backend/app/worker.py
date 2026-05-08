import os
import json
from celery import Celery
from .database import SessionLocal
from .models import CompanyDocument, DocumentStatus, Organization
from .services.s3 import s3_service
from .services.extraction import extraction_service, redact_pii
from .services.vector_db import vector_service
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "worker",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@celery_app.task(name="process_company_document")
def process_company_document(document_id: int):
    db = SessionLocal()
    try:
        doc = db.query(CompanyDocument).filter(CompanyDocument.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found")
            return

        # Download from S3
        response = s3_service.s3_client.get_object(
            Bucket=s3_service.bucket_name,
            Key=doc.s3_key
        )
        file_content = response['Body'].read()

        # Extract text
        text = extraction_service.extract_text(file_content, doc.content_type)
        logger.info(f"Extracted {len(text)} characters from document {document_id}")
        
        # Redact PII
        safe_text = redact_pii(text)
        
        # Vectorize and upsert to Pinecone
        vector_service.upsert_text(safe_text, doc_id=doc.id, org_id=doc.organization_id)

        # Extract company profile attributes via LLM
        extract_company_profile(safe_text, doc.organization_id, db)

        doc.status = DocumentStatus.PROCESSED
        db.commit()

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
        db.rollback()
        doc = db.query(CompanyDocument).filter(CompanyDocument.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.FAILED
            db.commit()
    finally:
        db.close()

def extract_company_profile(text: str, org_id: int, db):
    # Sanitize input: remove triple backticks to prevent delimiter collision/hijack
    safe_input = text[:4000].replace("```", " ")
    
    prompt = f"""
    You are an expert business analyst. Extract structured information from the company document provided below delimited by triple backticks.
    
    Document text:
    ```
    {safe_input}
    ```
    
    Return a JSON object with the following fields:
    - sector (e.g., SaaS, FinTech, DeepTech, Pharma)
    - headcount_range (e.g., 1-10, 11-50, 51-200, 200+)
    - revenue_tier (e.g., <1M, 1M-5M, 5M-20M, 20M+)
    - legal_entity_type (e.g., OU, LLC, AS, GmbH)
    - countries_of_operation (list of countries)
    - core_technologies (list of key tech used/built)
    
    ONLY return the JSON object.
    """
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        profile_data = json.loads(response.choices[0].message.content)
        
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            org.sector = profile_data.get("sector")
            org.headcount_range = profile_data.get("headcount_range")
            org.revenue_tier = profile_data.get("revenue_tier")
            org.legal_entity_type = profile_data.get("legal_entity_type")
            org.countries_of_operation = json.dumps(profile_data.get("countries_of_operation", []))
            org.core_technologies = json.dumps(profile_data.get("core_technologies", []))
            db.commit()
            logger.info(f"Updated profile for organization {org_id}")
            
    except Exception as e:
        logger.error(f"Failed to extract company profile: {e}")
