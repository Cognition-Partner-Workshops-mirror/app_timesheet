# Virtual Try-On Deployment & Infrastructure Guide

## Table of Contents
1. [Docker Setup](#docker-setup)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [GPU Usage](#gpu-usage)
4. [Scaling Strategy](#scaling-strategy)
5. [Performance & Optimization](#performance--optimization)

---

## Docker Setup

### Architecture: Separate AI and Backend Services

```
┌─────────────────────────────────────────────────────┐
│                 Docker Compose Stack                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │   Backend     │  │  AI Service  │                 │
│  │   (FastAPI)   │  │  (Python)    │                 │
│  │   Port: 8000  │  │  Port: 8001  │                 │
│  │   CPU only    │  │  GPU enabled │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                         │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────────┐ │
│  │  PostgreSQL   │  │    Redis     │  │   MinIO   │ │
│  │  Port: 5432   │  │  Port: 6379  │  │ Port:9000 │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Backend Dockerfile
```dockerfile
# Located at virtual-tryon/backend/Dockerfile
FROM python:3.11-slim

# Install system dependencies for image processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### AI Service Dockerfile
```dockerfile
# Located at virtual-tryon/ai-service/Dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download and cache ML models at build time
COPY scripts/download_models.py .
RUN python3 download_models.py

COPY . .
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
```

### docker-compose.yml Overview
```yaml
# Separate profiles for development and production
# Dev: docker-compose up
# Prod: docker-compose --profile production up
#
# GPU support requires nvidia-docker2 runtime
# AI service mounts GPU via deploy.resources.reservations
```

---

## Kubernetes Deployment

### Cluster Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Namespace: virtual-tryon                                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Ingress Controller (Nginx)                         │    │
│  │  - TLS termination                                  │    │
│  │  - Path-based routing                               │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│  ┌───────────────┐  ┌───┴───────────┐  ┌───────────────┐   │
│  │ Backend       │  │ AI Service    │  │ Worker Pods   │   │
│  │ Deployment    │  │ Deployment    │  │ (Job Queue)   │   │
│  │ Replicas: 3   │  │ Replicas: 2   │  │ Replicas: 2   │   │
│  │ CPU: 500m     │  │ GPU: 1        │  │ GPU: 1        │   │
│  │ Memory: 512Mi │  │ Memory: 4Gi   │  │ Memory: 4Gi   │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                  │                    │            │
│  ┌───────┴──────────────────┴────────────────────┴───────┐  │
│  │              Services & ConfigMaps                     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  - PostgreSQL StatefulSet (1 replica, PVC)            │  │
│  │  - Redis Deployment (1 replica)                       │  │
│  │  - MinIO StatefulSet (1 replica, PVC)                 │  │
│  │  - ConfigMap: app-config                              │  │
│  │  - Secret: app-secrets                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Resource Requirements

| Service     | CPU Request | CPU Limit | Memory Request | Memory Limit | GPU  |
|-------------|-------------|-----------|----------------|--------------|------|
| Backend     | 250m        | 500m      | 256Mi          | 512Mi        | -    |
| AI Service  | 1000m       | 2000m     | 2Gi            | 4Gi          | 1    |
| PostgreSQL  | 250m        | 500m      | 256Mi          | 512Mi        | -    |
| Redis       | 100m        | 200m      | 128Mi          | 256Mi        | -    |
| MinIO       | 250m        | 500m      | 256Mi          | 512Mi        | -    |

---

## GPU Usage

### GPU Requirements for AI Models

| Model              | GPU Memory | Inference Time | Recommended GPU       |
|--------------------|------------|----------------|-----------------------|
| MediaPipe Pose     | ~200MB     | ~50ms          | Any (CPU capable)     |
| U-Net Segmentation | ~500MB     | ~100ms         | NVIDIA T4 or better   |
| VITON Try-On       | ~2GB       | ~2-5s          | NVIDIA T4 / A10       |
| Stable Diffusion   | ~4GB       | ~5-15s         | NVIDIA A10 / A100     |

### GPU Scheduling in Kubernetes

```yaml
# Node labeling for GPU nodes
# kubectl label nodes <node-name> gpu-type=nvidia-t4

# Tolerations and affinity ensure AI pods land on GPU nodes
# NVIDIA device plugin required: nvidia/k8s-device-plugin
```

### GPU Memory Management Strategy

1. **Model Loading**: Load models into GPU memory on service startup
2. **Memory Pooling**: Use CUDA memory pools to avoid fragmentation
3. **Batch Processing**: Group inference requests for throughput
4. **Model Offloading**: Offload unused models to CPU RAM when idle
5. **Mixed Precision**: Use FP16 inference to halve memory usage

---

## Scaling Strategy

### Horizontal Pod Autoscaler (HPA)

```
Backend Service:
  - Min replicas: 2
  - Max replicas: 10
  - Scale trigger: CPU > 70% or Memory > 80%
  - Scale-up cooldown: 30 seconds
  - Scale-down cooldown: 300 seconds

AI Service:
  - Min replicas: 1
  - Max replicas: 5
  - Scale trigger: GPU utilization > 80% or queue depth > 10
  - Scale-up cooldown: 60 seconds (model loading time)
  - Scale-down cooldown: 600 seconds (avoid cold starts)
```

### Queue-Based Scaling

```
┌─────────┐    ┌──────────┐    ┌────────────────┐
│ Requests│───>│  Redis    │───>│  Worker Pods   │
│         │    │  Queue    │    │  (Auto-scaled) │
└─────────┘    └──────────┘    └────────────────┘
                    │
                    ▼
            Queue Depth Monitor
            (KEDA ScaledObject)
            - 0 messages: 1 pod
            - 1-10 messages: 2 pods
            - 10-50 messages: 5 pods
            - 50+ messages: 10 pods
```

---

## Performance & Optimization

### 1. Handling Large Images

| Strategy                | Implementation                                   |
|-------------------------|--------------------------------------------------|
| Server-side resize      | Resize to 768x1024 before processing              |
| Progressive upload      | Stream upload with chunked transfer encoding       |
| Client-side compression | Compress to 85% JPEG quality before upload         |
| Format optimization     | Convert to WebP for storage (30% smaller)          |
| Thumbnail generation    | Generate 256x256 thumbnails for previews           |

### 2. Reducing Latency

| Strategy              | Expected Improvement | Implementation                    |
|-----------------------|---------------------|-----------------------------------|
| Model warm-up         | -2s first request   | Pre-load models on startup         |
| GPU batch inference   | -40% per request    | Batch multiple requests together   |
| Mixed precision (FP16)| -30% inference time | Use torch.cuda.amp                 |
| TensorRT optimization | -50% inference time | Convert models to TensorRT format  |
| Async processing      | Non-blocking        | Queue-based async with polling     |
| Connection pooling    | -100ms per request  | SQLAlchemy + asyncpg pool          |
| CDN for results       | -200ms delivery     | Serve result images via CDN        |

### 3. Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│                  Cache Layers                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  L1: Application Cache (in-memory)                   │
│      - Model predictions for same input hash         │
│      - TTL: 5 minutes                                │
│      - Size: 100 entries per pod                     │
│                                                      │
│  L2: Redis Cache                                     │
│      - Try-on results by (user_img + product_img)    │
│      - TTL: 1 hour                                   │
│      - Keyed by SHA256 hash of input images          │
│                                                      │
│  L3: CDN Cache                                       │
│      - Final result images                           │
│      - TTL: 24 hours                                 │
│      - Purge on user request                         │
│                                                      │
│  Cache Hit Rates (Expected):                         │
│      - Same user + same product: ~90% (L2 hit)       │
│      - Popular products: ~60% (L2 partial hit)       │
│      - Result delivery: ~95% (L3 hit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 4. Monitoring & Observability

| Metric                  | Tool          | Alert Threshold          |
|-------------------------|---------------|--------------------------|
| Request latency (p99)   | Prometheus    | > 30 seconds             |
| GPU utilization         | DCGM Exporter | > 90% for 5 minutes      |
| Queue depth             | Redis metrics | > 50 pending jobs        |
| Error rate              | Prometheus    | > 5% of requests         |
| Model inference time    | Custom metric | > 10 seconds             |
| Storage usage           | MinIO metrics | > 80% capacity           |
