from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..auth import get_current_user
from ..services.vector_db import vector_service
from ..services.extraction import extraction_service

router = APIRouter(
    prefix="/grants",
    tags=["grants"]
)

@router.get("/matches", response_model=List[schemas.GrantMatchOut])
async def get_matches(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Construct a query text from the organization profile attributes
    import json
    techs = []
    if org.core_technologies:
        try:
            techs = json.loads(org.core_technologies)
        except Exception:
            techs = []
    countries = []
    if org.countries_of_operation:
        try:
            countries = json.loads(org.countries_of_operation)
        except Exception:
            countries = []
            
    query_parts = []
    if org.sector:
        query_parts.append(f"Sector: {org.sector}")
    if techs:
        query_parts.append(f"Technologies: {', '.join(techs)}")
    if countries:
        query_parts.append(f"Countries: {', '.join(countries)}")
    if org.headcount_range:
        query_parts.append(f"Headcount: {org.headcount_range}")
    if org.revenue_tier:
        query_parts.append(f"Revenue Tier: {org.revenue_tier}")
        
    query_text = " ".join(query_parts) if query_parts else "General business innovation grant"
    
    # Call the vector service search
    matches_from_vector = vector_service.search_grants(query_text=query_text, top_k=10)
    
    results = []
    for match in matches_from_vector:
        grant_id = match.get("grant_id")
        score = match.get("score", 0.0)
        
        # Skip if score is below the organization's match threshold
        if score < (org.match_threshold or 0.7):
            continue
            
        grant = db.query(models.Grant).filter(models.Grant.id == grant_id).first()
        if not grant:
            continue
            
        # Check if match is already cached in DB
        grant_match = db.query(models.GrantMatch).filter(
            models.GrantMatch.organization_id == org.id,
            models.GrantMatch.grant_id == grant.id
        ).first()
        
        if not grant_match:
            # Generate AI explanation
            org_profile_summary = f"Sector: {org.sector or 'N/A'}, Technologies: {', '.join(techs) if techs else 'N/A'}, Operations: {', '.join(countries) if countries else 'N/A'}"
            grant_desc_summary = f"Title: {grant.title}. Description: {grant.description}. Eligibility: {grant.eligibility_criteria}."
            explanation = extraction_service.explain_match(org_profile_summary, grant_desc_summary)
            
            grant_match = models.GrantMatch(
                organization_id=org.id,
                grant_id=grant.id,
                score=score,
                explanation=explanation,
                alert_sent=False
            )
            db.add(grant_match)
            db.commit()
            db.refresh(grant_match)
        else:
            # Update score
            grant_match.score = score
            if not grant_match.explanation:
                org_profile_summary = f"Sector: {org.sector or 'N/A'}, Technologies: {', '.join(techs) if techs else 'N/A'}, Operations: {', '.join(countries) if countries else 'N/A'}"
                grant_desc_summary = f"Title: {grant.title}. Description: {grant.description}. Eligibility: {grant.eligibility_criteria}."
                grant_match.explanation = extraction_service.explain_match(org_profile_summary, grant_desc_summary)
            db.commit()
            db.refresh(grant_match)
            
        results.append(grant_match)
        
    # Sort descending by score
    results.sort(key=lambda x: x.score, reverse=True)
    return results

@router.patch("/settings", response_model=schemas.OrganizationOut)
async def update_settings(
    settings: schemas.OrganizationUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.WRITER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update settings"
        )
    
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if settings.match_threshold is not None:
        org.match_threshold = settings.match_threshold
    if settings.alert_email_enabled is not None:
        org.alert_email_enabled = settings.alert_email_enabled
        
    db.commit()
    db.refresh(org)
    return org
