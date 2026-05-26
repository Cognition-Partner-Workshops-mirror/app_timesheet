"""
Application configuration module.
Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path

# Base directory for the backend application
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Upload directories for images and requirements documents
UPLOAD_DIR = BASE_DIR / "uploads"
IMAGES_DIR = UPLOAD_DIR / "images"
REQUIREMENTS_DIR = UPLOAD_DIR / "requirements"

# Ensure upload directories exist
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
REQUIREMENTS_DIR.mkdir(parents=True, exist_ok=True)

# Data directory for persisting project JSON files
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# OpenAI API key loaded from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# OpenAI model to use for text generation
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

# OpenAI model to use for vision/image analysis
OPENAI_VISION_MODEL = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o")

# Maximum file size for uploads (10 MB)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

# Allowed image extensions
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}

# Allowed document extensions
ALLOWED_DOC_EXTENSIONS = {".txt", ".md", ".pdf", ".docx", ".doc"}

# CORS origins
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
