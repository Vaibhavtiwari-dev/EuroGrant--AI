from fastapi import FastAPI, Depends, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from . import models, schemas
from .routers import auth as auth_router, uploads as uploads_router, organizations as organizations_router, grants as grants_router
from .auth import get_current_user

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="EuroGrant AI API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://eurogrant.ai",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Versioning: v1 Router
api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router.router)
api_v1_router.include_router(uploads_router.router)
api_v1_router.include_router(organizations_router.router)
api_v1_router.include_router(grants_router.router)

# Include versioned router in app
app.include_router(api_v1_router)

# Global/Unversioned Routes
@app.get("/")
@limiter.limit("5/minute")
async def root(request: Request):
    return {"message": "Welcome to EuroGrant AI API"}

@app.get("/api/v1/users/me", response_model=schemas.UserOut)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
