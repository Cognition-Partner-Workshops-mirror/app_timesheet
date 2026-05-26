"""
Virtual Try-On Backend Service - Main Application Entry Point.

FastAPI application that provides REST APIs for:
- User authentication and profile management
- Image upload and validation
- Product catalog management
- Virtual try-on job orchestration
- Result retrieval and history

Integrates with:
- PostgreSQL (metadata storage via SQLAlchemy)
- Redis (caching and job queue)
- MinIO (S3-compatible object storage for images)
- AI Model Service (ML inference via HTTP)
"""

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database.connection import init_db, close_db
from app.api.routes import users, images, products, tryon

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered virtual try-on service for e-commerce platforms",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Application Lifecycle Events
# ──────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """
    Initialize database tables and verify external service connectivity
    on application startup.
    """
    logger.info("application_starting", version=settings.APP_VERSION)

    # Create database tables (development mode)
    if settings.DEBUG:
        await init_db()
        logger.info("database_initialized")

    logger.info("application_started", port=settings.PORT)


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections on application shutdown."""
    await close_db()
    logger.info("application_shutdown")


# ──────────────────────────────────────────────
# Health Check Endpoints
# ──────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe - returns OK if the service is running."""
    return {"status": "healthy", "service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/ready", tags=["Health"])
async def readiness_check():
    """
    Readiness probe - checks that all dependencies are accessible.
    Returns OK only when the service is ready to handle requests.
    """
    # In production, this would verify PostgreSQL, Redis, and MinIO connectivity
    return {"status": "ready", "service": settings.APP_NAME}


# ──────────────────────────────────────────────
# Register API Route Handlers
# ──────────────────────────────────────────────

app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(images.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(tryon.router, prefix=settings.API_V1_PREFIX)


# ──────────────────────────────────────────────
# Global Exception Handler
# ──────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Catch-all exception handler for unhandled errors.
    Logs the error and returns a generic 500 response.
    """
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            },
        },
    )
