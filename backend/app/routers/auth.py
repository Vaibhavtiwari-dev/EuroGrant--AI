import os
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from .. import models, schemas, auth, database
from ..limiter import limiter
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, user_in: schemas.UserCreate, db: Session = Depends(database.get_db)):
    # Validate invite code - Mandatory environment variable check
    master_invite_code = os.getenv("MASTER_INVITE_CODE")
    if not master_invite_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration system is misconfigured. MASTER_INVITE_CODE environment variable is missing."
        )
        
    if user_in.invite_code != master_invite_code:
        raise HTTPException(status_code=403, detail="Invalid invite code")

    # Check if user already exists
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if organization exists or create new
    org = db.query(models.Organization).filter(models.Organization.name == user_in.organization_name).first()
    if not org:
        org = models.Organization(name=user_in.organization_name)
        db.add(org)
        db.commit()
        db.refresh(org)
    
    # Check if org already has users to determine role
    existing_user_count = db.query(models.User).filter(models.User.organization_id == org.id).count()
    user_role = models.RoleEnum.ADMIN if existing_user_count == 0 else models.RoleEnum.VIEWER
    
    # Create user
    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        organization_id=org.id,
        role=user_role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, response: Response, user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.username).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Credentials")
    
    if not auth.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Credentials")
    
    access_token = auth.create_access_token(data={"sub": user.email})

    # Set httpOnly cookie for secure browser-based auth
    is_localhost = os.getenv("ENVIRONMENT", "development") == "development"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not is_localhost,
        samesite="lax",
        max_age=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {"access_token": access_token, "token_type": "bearer"}  # nosec B105


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    return {"message": "Successfully logged out"}
