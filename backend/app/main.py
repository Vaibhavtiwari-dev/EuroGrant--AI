from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from . import models, schemas
from .routers import auth as auth_router, uploads as uploads_router, organizations as organizations_router
from .auth import get_current_user

app = FastAPI(title="EuroGrant AI API")

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

app.include_router(auth_router.router)
app.include_router(uploads_router.router)
app.include_router(organizations_router.router)


@app.get("/")
async def root():
    return {"message": "Welcome to EuroGrant AI API"}

@app.get("/users/me", response_model=schemas.UserOut)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
