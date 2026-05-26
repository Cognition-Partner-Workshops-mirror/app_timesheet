# Virtual Try-On Backend Service Dockerfile
# Multi-stage build for optimized production image

# ── Stage 1: Build dependencies ──
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for native Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Production image ──
FROM python:3.11-slim

# Install runtime dependencies for image processing (Pillow, OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy application source code
COPY . .

# Switch to non-root user
USER appuser

# Expose the backend API port
EXPOSE 8000

# Health check endpoint for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the FastAPI application with Uvicorn ASGI server
# Workers count can be overridden via environment variable
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
