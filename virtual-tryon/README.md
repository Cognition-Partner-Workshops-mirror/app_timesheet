# Virtual Try-On Feature

AI-powered virtual fitting room for e-commerce platforms. Users can upload a full-body photo, select a garment from the product catalog, and generate a realistic image showing how the garment looks on them.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Client     │────>│  Backend API │────>│  AI Service    │
│   (Web/App)  │     │  (FastAPI)   │     │  (Python/GPU)  │
└─────────────┘     └──────┬───────┘     └───────┬────────┘
                           │                      │
                    ┌──────┴──────────────────────┴────────┐
                    │            Data Layer                  │
                    │  PostgreSQL │ Redis │ MinIO (S3)      │
                    └──────────────────────────────────────┘
```

### Microservices

| Service          | Technology     | Port | Purpose                              |
|------------------|---------------|------|--------------------------------------|
| Backend API      | FastAPI        | 8000 | REST API, job orchestration          |
| AI Model Service | FastAPI + PyTorch | 8001 | ML inference (pose, segmentation, try-on) |
| PostgreSQL       | PostgreSQL 15  | 5432 | Relational metadata storage          |
| Redis            | Redis 7        | 6379 | Caching, job queue                   |
| MinIO            | MinIO          | 9000 | S3-compatible image storage          |

## AI/ML Pipeline

### 1. Pose Estimation (MediaPipe)
- Detects 33 body landmarks (shoulders, waist, hips, etc.)
- Computes body measurements for garment sizing
- Determines pose orientation (frontal/side)

### 2. Body Segmentation (U-Net)
- Pixel-level segmentation: body, background, clothing, skin, hair
- Encoder-decoder architecture with skip connections
- Supports FP16 mixed-precision inference for GPU acceleration

### 3. Virtual Try-On Engine (VITON-based)
- **Garment Warping**: Thin Plate Spline (TPS) transformation aligns garment to body
- **Image Composition**: Alpha blending with feathered edges
- **Lighting Adjustment**: LAB color space luminance transfer
- **Post-Processing**: Unsharp mask sharpening, color correction

## Quick Start

### Prerequisites
- Docker 20.10+ and Docker Compose v2
- (Optional) NVIDIA GPU + nvidia-docker2 for accelerated inference

### Run with Docker Compose

```bash
# Start all services (CPU mode)
cd virtual-tryon
docker-compose up -d

# Start with GPU support
docker-compose --profile gpu up -d

# View logs
docker-compose logs -f backend ai-service
```

### Access Points
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **AI Service**: http://localhost:8001
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## API Endpoints

### Image Upload
```bash
# Upload a user photo
curl -X POST http://localhost:8000/api/v1/images/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  -F "image_type=user_photo"
```

### Generate Try-On
```bash
# Start a try-on generation job
curl -X POST http://localhost:8000/api/v1/tryon/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_image_id": "img_abc123",
    "product_image_id": "img_def456",
    "options": {
      "preserve_background": true,
      "adjust_lighting": true
    }
  }'

# Poll job status
curl http://localhost:8000/api/v1/tryon/status/<job_id> \
  -H "Authorization: Bearer <token>"
```

## Project Structure

```
virtual-tryon/
├── docs/                          # System design documentation
│   ├── SYSTEM_DESIGN.md           # HLD, LLD, data flow diagrams
│   ├── API_DESIGN.md              # Complete API specification
│   ├── DATABASE_SCHEMA.md         # Schema definitions, ERD
│   └── DEPLOYMENT.md              # Infra, GPU, scaling guide
├── backend/                       # FastAPI backend service
│   ├── app/
│   │   ├── api/routes/            # REST endpoint handlers
│   │   │   ├── users.py           # Auth & user management
│   │   │   ├── images.py          # Image upload & management
│   │   │   ├── products.py        # Product catalog CRUD
│   │   │   └── tryon.py           # Try-on job orchestration
│   │   ├── core/                  # Config & security
│   │   ├── database/              # SQLAlchemy models & connection
│   │   ├── models/                # Pydantic schemas
│   │   └── services/              # Business logic layer
│   ├── Dockerfile
│   └── requirements.txt
├── ai-service/                    # AI model inference service
│   ├── app/
│   │   ├── models/                # ML model implementations
│   │   │   ├── pose_estimator.py  # MediaPipe pose detection
│   │   │   ├── segmentation.py    # U-Net body segmentation
│   │   │   └── tryon_engine.py    # VITON try-on generation
│   │   └── pipeline/
│   │       └── processor.py       # End-to-end inference pipeline
│   ├── scripts/
│   │   └── download_models.py     # Model download utility
│   ├── Dockerfile
│   └── requirements.txt
├── k8s/                           # Kubernetes deployment manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── backend-deployment.yaml    # Backend + HPA
│   ├── ai-service-deployment.yaml # AI Service + GPU scheduling
│   ├── postgres-deployment.yaml   # PostgreSQL StatefulSet
│   ├── redis-deployment.yaml
│   ├── minio-deployment.yaml      # MinIO StatefulSet
│   └── ingress.yaml               # Nginx ingress routing
├── tests/                         # Test suites
│   ├── backend/
│   └── ai_service/
└── docker-compose.yml             # Local development stack
```

## Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/minio-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/ai-service-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Verify
kubectl get pods -n virtual-tryon
```

## Performance Optimization

| Strategy                 | Impact                     |
|--------------------------|----------------------------|
| FP16 mixed precision     | 30% faster GPU inference   |
| Model warm-up on startup | Eliminates cold-start lag  |
| Redis result caching     | ~90% cache hit for repeats |
| Feathered edge blending  | Seamless garment overlay   |
| Async job processing     | Non-blocking API responses |
| Connection pooling       | Reduced DB latency         |

## Documentation

- [System Design (HLD/LLD)](docs/SYSTEM_DESIGN.md)
- [API Design](docs/API_DESIGN.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Technology Stack

All open-source technologies:
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Uvicorn
- **AI/ML**: PyTorch, MediaPipe, OpenCV, segmentation-models-pytorch
- **Database**: PostgreSQL 15, Redis 7
- **Storage**: MinIO (S3-compatible)
- **Infrastructure**: Docker, Kubernetes, Nginx
- **Monitoring**: Prometheus, structlog
