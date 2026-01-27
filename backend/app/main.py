from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.endpoints import auth, users, systems, requests, admin, subsystems, approval_chain, export, dashboard_cards
import os

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded icons
UPLOAD_DIR = "/opt/idm-system/backend/uploads/icons"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads/icons", StaticFiles(directory=UPLOAD_DIR), name="icons")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(systems.router, prefix="/api/systems", tags=["Systems"])
app.include_router(subsystems.router, prefix="/api", tags=["Subsystems"])
app.include_router(approval_chain.router, prefix="/api", tags=["Approval Chain"])
app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(dashboard_cards.router, prefix="/api/dashboard-cards", tags=["Dashboard Cards"])


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
