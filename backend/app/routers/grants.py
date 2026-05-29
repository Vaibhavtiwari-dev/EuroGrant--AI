from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import json
import logging

from .. import models, schemas, database
from ..auth import get_current_user
from ..services.vector_db import vector_service
from ..limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/grants",
    tags=["Grants Opportunities"]
)

@router.post("/search", response_model=List[schemas.GrantOut])
@limiter.limit("15/minute")
def search_grants(
    request: Request,
    search_req: schemas.GrantSearchRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Search public grant opportunities. Integrates hybrid semantic vector search
    with SQL fallback to guarantee seamless offline local development.
    """
    grant_ids = []
    
    # 1. Try Pinecone Vector Search if a search query is present
    if search_req.query:
        try:
            grant_ids = vector_service.query_grants(search_req.query, limit=search_req.limit * 2)
        except Exception as e:
            logger.warning(f"Semantic search failed or bypassed: {e}. Falling back to standard SQL query.")

    # 2. SQL Database Retrieval
    query = db.query(models.Grant)
    
    if grant_ids:
        # Load specific semantic matches
        query = query.filter(models.Grant.id.in_(grant_ids))
    elif search_req.query:
        # Fallback: SQL text matching if semantic search returned nothing/was offline
        search_pattern = f"%{search_req.query}%"
        query = query.filter(
            or_(
                models.Grant.title.ilike(search_pattern),
                models.Grant.description.ilike(search_pattern),
                models.Grant.eligibility_criteria.ilike(search_pattern)
            )
        )
        
    # 3. Apply Sector/Tag Filters (if provided)
    # The database sector_tags column holds a JSON serialized string (e.g. '["GreenTech", "SaaS"]')
    if search_req.sectors:
        # SQLite / Postgres compatible JSON array lookup fallback:
        # We fetch extra items and filter them in memory to ensure complete compatibility.
        all_results = query.offset(search_req.offset).limit(search_req.limit * 2).all()
        filtered = []
        for grant in all_results:
            try:
                tags = json.loads(grant.sector_tags) if grant.sector_tags else []
                # Check if there is intersection
                if any(sec in tags for sec in search_req.sectors):
                    filtered.append(grant)
            except Exception as json_err:
                logger.warning(f"Failed to parse sector tags for grant {grant.id}: {json_err}")
                continue
        return filtered[:search_req.limit]

    # Return standard paginated results
    results = query.offset(search_req.offset).limit(search_req.limit).all()
    return results

@router.get("/{grant_id}", response_model=schemas.GrantOut)
def get_grant_by_id(
    grant_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    grant = db.query(models.Grant).filter(models.Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grant opportunity with ID {grant_id} not found."
        )
    return grant
