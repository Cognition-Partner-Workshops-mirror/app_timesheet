# Dockerfile for the Python ML fraud detection service.
# Uses a slim Python image with only necessary ML dependencies installed.

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for numpy/scikit-learn compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose gRPC port
EXPOSE 50052

# Run the fraud detection gRPC server
CMD ["python", "-m", "src.grpc_server"]
