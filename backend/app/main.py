"""
Main FastAPI application entry point.
Configures CORS, mounts static files, and registers API routes.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.projects import router as projects_router
from app.core.config import CORS_ORIGINS, IMAGES_DIR

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="HLD/LLD Generator",
    description="AI-powered High-Level and Low-Level Design document generator for microservices architectures",
    version="1.0.0",
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files for the frontend to display
app.mount("/uploads/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Register API routes
app.include_router(projects_router)


@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "service": "hld-lld-generator"}
