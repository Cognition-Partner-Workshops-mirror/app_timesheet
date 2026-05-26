"""
CareAI Backend - Main Application Entry Point
AI-powered Digital Healthcare Platform API.
Initializes FastAPI app, registers routers, and configures middleware.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db, close_db, async_session
from app.utils.seed_data import seed_database
from app.routers import auth, doctors, appointments, ai_services, health_records, prescriptions, admin, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - initialize DB and seed data on startup."""
    # Startup: Initialize database tables and seed data
    await init_db()
    async with async_session() as session:
        await seed_database(session)
    yield
    # Shutdown: Close database connections
    await close_db()


# Create FastAPI application instance
app = FastAPI(
    title="CareAI - AI-Powered Healthcare Platform",
    description="""
    🏥 **CareAI** is a next-generation AI-powered digital healthcare platform.

    ## Features
    - 👤 **Patient Portal**: Doctor search, appointment booking, AI symptom checker, health records
    - 👨‍⚕️ **Doctor Portal**: Appointment management, patient records, digital prescriptions
    - 🏢 **Admin Dashboard**: Analytics, doctor onboarding, user management
    - 🤖 **AI Services**: Symptom triage, health insights, medical chatbot
    - 📹 **Video Consultation**: Real-time telemedicine via WebRTC

    ## Authentication
    All endpoints (except auth) require a JWT Bearer token.
    Register/login to get your token.

    ## Demo Accounts
    - **Patient**: patient@careai.com / patient123
    - **Doctor**: dr.sharma@careai.com / doctor123
    - **Admin**: admin@careai.com / admin123
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Configure CORS for mobile app and admin panel access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers with version prefix
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(doctors.router, prefix=settings.API_PREFIX)
app.include_router(appointments.router, prefix=settings.API_PREFIX)
app.include_router(ai_services.router, prefix=settings.API_PREFIX)
app.include_router(health_records.router, prefix=settings.API_PREFIX)
app.include_router(prescriptions.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    """Root endpoint - API health check and welcome message."""
    return {
        "app": "CareAI",
        "version": settings.APP_VERSION,
        "status": "running",
        "message": "Welcome to CareAI - AI-Powered Healthcare Platform",
        "docs": "/docs",
        "api_prefix": settings.API_PREFIX,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancer probes."""
    return {"status": "healthy", "service": "careai-backend"}
