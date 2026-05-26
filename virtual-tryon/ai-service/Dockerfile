# Virtual Try-On AI Model Service Dockerfile
# Built on NVIDIA CUDA base image for GPU-accelerated ML inference

# ── Stage 1: Base with CUDA runtime ──
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04 AS base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3.11 and system dependencies for OpenCV, MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# ── Stage 2: Install Python dependencies ──
FROM base AS builder

WORKDIR /app
COPY requirements.txt .

# Install PyTorch with CUDA support and all other dependencies
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 3: Production image ──
FROM base

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN groupadd -r aiuser && useradd -r -g aiuser aiuser

WORKDIR /app

# Create model cache directory
RUN mkdir -p /app/models && chown -R aiuser:aiuser /app

# Copy application source code
COPY . .

# Switch to non-root user
USER aiuser

# Expose the AI service API port
EXPOSE 8001

# Health check for Kubernetes liveness probe
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start with fewer workers since each loads ML models into GPU memory
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
