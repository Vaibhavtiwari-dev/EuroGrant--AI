from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..auth import get_current_user

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"]
)

@router.get("/me", response_model=schemas.OrganizationOut)
async def get_my_organization(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.get("/dashboard-overview", response_model=schemas.DashboardOverviewOut)
async def get_dashboard_overview(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Fetch real data where possible, use placeholders for missing features
    
    # 1. Stats
    # active_high_matches: Count of company documents that are processed (placeholder for real matches)
    doc_count = db.query(models.CompanyDocument).filter(
        models.CompanyDocument.organization_id == current_user.organization_id
    ).count()
    
    stats = schemas.DashboardStatsOut(
        active_high_matches=doc_count, # Placeholder: using doc count as active matches for now
        ai_generation_quality=94, # Static placeholder
        total_pipeline_value=1.5 * doc_count # Placeholder multiplier
    )
    
    # 2. Pipelines (Placeholder until proposal generation is live)
    pipelines = [
        schemas.PipelineOut(
            id="EIC-2024-ACCELERATOR-01",
            title="Project GreenLithium • €2.5M Request",
            status="GENERATING",
            progress=65,
            subtext="Context Assembling (RAG)"
        )
    ] if doc_count > 0 else []
    
    # 3. Hot Matches (Placeholder until semantic matching is live)
    hot_matches = [
        schemas.MatchOut(
            title="Innovate UK: Smart Sustainable Manufacturing",
            desc="Direct alignment with your recent portfolio updates regarding IoT...",
            score=98,
            time="2H AGO"
        )
    ] if doc_count > 0 else []
    
    return schemas.DashboardOverviewOut(
        stats=stats,
        pipelines=pipelines,
        hot_matches=hot_matches
    )

@router.put("/me", response_model=schemas.OrganizationOut)
async def update_my_organization(
    org_update: schemas.OrganizationUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    update_data = org_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
        
    db.commit()
    db.refresh(org)
    return org
