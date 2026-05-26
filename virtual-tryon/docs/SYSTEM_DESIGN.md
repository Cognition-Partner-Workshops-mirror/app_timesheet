# Virtual Try-On System Design

## Table of Contents
1. [High-Level Architecture (HLD)](#high-level-architecture)
2. [Low-Level Design (LLD)](#low-level-design)
3. [Data Flow Pipeline](#data-flow-pipeline)
4. [Microservices Architecture](#microservices-architecture)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Web / Mobile)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────────┐ │
│  │ Product       │  │ Image Upload │  │ Try-On Result Display        │ │
│  │ Catalog UI    │  │ Component    │  │ Component                    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────────▲───────────────┘ │
└─────────┼─────────────────┼──────────────────────────┼─────────────────┘
          │                 │                           │
          ▼                 ▼                           │
┌─────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / LOAD BALANCER                      │
│                    (Nginx / Kong / AWS ALB)                             │
└────┬──────────────────┬──────────────────┬──────────────────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌──────────┐   ┌───────────────┐   ┌──────────────────┐
│  User     │   │  Product      │   │  Image Processing │
│  Service  │   │  Service      │   │  Service (FastAPI)│
│  (FastAPI)│   │  (FastAPI)    │   │                    │
└──────────┘   └───────────────┘   └────────┬───────────┘
     │                  │                    │
     │                  │                    ▼
     │                  │            ┌──────────────────┐
     │                  │            │  AI Model Service │
     │                  │            │  (Python/FastAPI)  │
     │                  │            │                    │
     │                  │            │  - Pose Estimation │
     │                  │            │  - Segmentation    │
     │                  │            │  - Try-On Engine   │
     │                  │            └────────┬───────────┘
     │                  │                     │
     ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ PostgreSQL   │  │ Redis Cache  │  │ Object Store │                  │
│  │ (Metadata)   │  │ (Sessions &  │  │ (MinIO/S3)   │                  │
│  │              │  │  Results)    │  │ (Images)     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component             | Technology        | Purpose                                          |
|-----------------------|-------------------|--------------------------------------------------|
| API Gateway           | Nginx / Kong      | Request routing, rate limiting, SSL termination  |
| User Service          | FastAPI (Python)  | Authentication, user profile management          |
| Product Service       | FastAPI (Python)  | Product catalog, dress metadata                  |
| Image Processing Svc  | FastAPI (Python)  | Image upload, validation, preprocessing          |
| AI Model Service      | FastAPI (Python)  | ML inference: pose, segmentation, try-on         |
| PostgreSQL            | PostgreSQL 15+    | Relational data (users, products, try-on jobs)   |
| Redis                 | Redis 7+          | Caching, session store, job queue                |
| Object Storage        | MinIO (S3-compat) | Binary image storage (user photos, results)      |
| Message Queue         | Redis Streams     | Async job processing for try-on generation       |

---

## Low-Level Design

### 1. User Service (LLD)

```
┌─────────────────────────────────────────┐
│              User Service               │
├─────────────────────────────────────────┤
│ Controllers:                            │
│   - POST /api/v1/users/register         │
│   - POST /api/v1/users/login            │
│   - GET  /api/v1/users/profile          │
│   - PUT  /api/v1/users/profile          │
│   - POST /api/v1/users/upload-photo     │
├─────────────────────────────────────────┤
│ Models:                                 │
│   - User (id, email, name, created_at)  │
│   - UserPhoto (id, user_id, url, type)  │
├─────────────────────────────────────────┤
│ Services:                               │
│   - AuthService (JWT generation/verify) │
│   - UserService (CRUD operations)       │
│   - StorageService (image upload to S3) │
└─────────────────────────────────────────┘
```

### 2. Product Service (LLD)

```
┌────────────────────────────────────────────────┐
│              Product Service                    │
├────────────────────────────────────────────────┤
│ Controllers:                                    │
│   - GET  /api/v1/products                       │
│   - GET  /api/v1/products/:id                   │
│   - POST /api/v1/products (admin)               │
│   - PUT  /api/v1/products/:id (admin)           │
│   - GET  /api/v1/products/:id/images            │
├────────────────────────────────────────────────┤
│ Models:                                         │
│   - Product (id, name, category, price, ...)    │
│   - ProductImage (id, product_id, url, type)    │
│   - Category (id, name, parent_id)              │
├────────────────────────────────────────────────┤
│ Services:                                       │
│   - ProductService (catalog CRUD)               │
│   - CategoryService (taxonomy management)       │
│   - ImageService (product image management)     │
└────────────────────────────────────────────────┘
```

### 3. Image Processing Service (LLD)

```
┌──────────────────────────────────────────────────┐
│          Image Processing Service                 │
├──────────────────────────────────────────────────┤
│ Controllers:                                      │
│   - POST /api/v1/images/upload                    │
│   - POST /api/v1/images/validate                  │
│   - GET  /api/v1/images/:id                       │
│   - DELETE /api/v1/images/:id                     │
├──────────────────────────────────────────────────┤
│ Processing Pipeline:                              │
│   1. Image validation (format, size, resolution)  │
│   2. Image resizing & normalization               │
│   3. EXIF data extraction                         │
│   4. Thumbnail generation                         │
│   5. Upload to object storage                     │
├──────────────────────────────────────────────────┤
│ Services:                                         │
│   - ValidationService                             │
│   - ResizeService (PIL/Pillow)                    │
│   - StorageService (MinIO/S3)                     │
│   - MetadataService                               │
└──────────────────────────────────────────────────┘
```

### 4. AI Model Service (LLD)

```
┌───────────────────────────────────────────────────────────┐
│                  AI Model Service                          │
├───────────────────────────────────────────────────────────┤
│ Controllers:                                               │
│   - POST /api/v1/tryon/generate                            │
│   - GET  /api/v1/tryon/status/:job_id                      │
│   - GET  /api/v1/tryon/result/:job_id                      │
├───────────────────────────────────────────────────────────┤
│ ML Pipeline Modules:                                       │
│                                                            │
│   ┌──────────────────┐                                     │
│   │ Pose Estimator   │ MediaPipe / OpenPose                │
│   │ - detect_pose()  │ - 33 body landmarks                 │
│   │ - get_keypoints()│ - shoulder, waist, hip detection     │
│   └────────┬─────────┘                                     │
│            ▼                                               │
│   ┌──────────────────┐                                     │
│   │ Body Segmentor   │ U-Net / Mask R-CNN                  │
│   │ - segment_body() │ - body/background separation        │
│   │ - segment_cloth()│ - clothing region extraction         │
│   │ - get_mask()     │ - binary mask generation             │
│   └────────┬─────────┘                                     │
│            ▼                                               │
│   ┌──────────────────┐                                     │
│   │ Try-On Engine    │ VITON / CP-VTON / Diffusion         │
│   │ - warp_garment() │ - geometric transformation          │
│   │ - blend_image()  │ - lighting & shadow adjustment       │
│   │ - generate()     │ - final composite generation         │
│   └──────────────────┘                                     │
├───────────────────────────────────────────────────────────┤
│ Model Registry:                                            │
│   - Model versioning & A/B testing                         │
│   - Model warm-up on startup                               │
│   - GPU memory management                                  │
└───────────────────────────────────────────────────────────┘
```

---

## Data Flow Pipeline

### Step-by-Step Try-On Generation Flow

```
Step 1: User Action
├── User selects a dress from the product catalog
├── User uploads a full-body photo
└── Client sends both images to the backend

Step 2: Image Validation & Upload
├── Image Processing Service validates:
│   ├── File format (JPEG, PNG, WebP)
│   ├── File size (max 10MB)
│   ├── Resolution (min 512x512, max 4096x4096)
│   └── Content safety check
├── Images resized to standard dimensions (768x1024)
├── Images uploaded to object storage (MinIO/S3)
└── Metadata stored in PostgreSQL

Step 3: Try-On Job Creation
├── Backend creates a try-on job record
├── Job pushed to Redis message queue
├── Client receives job_id for polling
└── WebSocket connection established for real-time updates

Step 4: AI Processing Pipeline
├── 4a. Pose Estimation (MediaPipe)
│   ├── Detect 33 body landmarks
│   ├── Calculate body measurements
│   ├── Determine pose orientation
│   └── Generate pose keypoint map
│
├── 4b. Body Segmentation (U-Net)
│   ├── Segment body from background
│   ├── Segment existing clothing
│   ├── Generate body parsing map
│   └── Create binary masks
│
├── 4c. Garment Processing
│   ├── Extract garment from product image
│   ├── Generate garment mask
│   ├── Detect garment keypoints
│   └── Prepare garment for warping
│
├── 4d. Geometric Transformation
│   ├── Compute thin-plate spline (TPS) transformation
│   ├── Warp garment to match body pose
│   ├── Align garment keypoints with body keypoints
│   └── Generate warped garment image
│
└── 4e. Image Synthesis (VITON/Diffusion)
    ├── Combine warped garment with body
    ├── Apply lighting and shadow corrections
    ├── Blend edges for seamless integration
    ├── Apply fabric texture rendering
    └── Generate final composite image

Step 5: Result Delivery
├── Result image uploaded to object storage
├── Job status updated in database
├── Client notified via WebSocket / polling
└── Result cached in Redis (TTL: 1 hour)
```

### Sequence Diagram

```
Client          API Gateway     Backend         AI Service      Storage
  │                 │              │                │              │
  │  Upload Images  │              │                │              │
  │────────────────>│              │                │              │
  │                 │  Validate    │                │              │
  │                 │─────────────>│                │              │
  │                 │              │  Store Images  │              │
  │                 │              │───────────────────────────────>│
  │                 │              │                │              │
  │  Create Job     │              │                │              │
  │────────────────>│              │                │              │
  │                 │  Queue Job   │                │              │
  │                 │─────────────>│                │              │
  │  job_id         │              │                │              │
  │<────────────────│              │                │              │
  │                 │              │  Process Job   │              │
  │                 │              │───────────────>│              │
  │                 │              │                │ Fetch Images │
  │                 │              │                │─────────────>│
  │                 │              │                │              │
  │                 │              │                │ Pose Est.    │
  │                 │              │                │──┐           │
  │                 │              │                │  │           │
  │                 │              │                │<─┘           │
  │                 │              │                │              │
  │                 │              │                │ Segmentation │
  │                 │              │                │──┐           │
  │                 │              │                │  │           │
  │                 │              │                │<─┘           │
  │                 │              │                │              │
  │                 │              │                │ Try-On Gen   │
  │                 │              │                │──┐           │
  │                 │              │                │  │           │
  │                 │              │                │<─┘           │
  │                 │              │                │              │
  │                 │              │                │ Store Result │
  │                 │              │                │─────────────>│
  │                 │              │  Job Complete  │              │
  │                 │              │<───────────────│              │
  │  Poll Status    │              │                │              │
  │────────────────>│              │                │              │
  │  Result URL     │              │                │              │
  │<────────────────│              │                │              │
  │                 │              │                │              │
  │  Fetch Result   │              │                │              │
  │────────────────────────────────────────────────────────────────>│
  │  Result Image   │              │                │              │
  │<───────────────────────────────────────────────────────────────│
```

---

## Microservices Architecture

### Service Communication

| From                  | To                   | Protocol   | Purpose                          |
|-----------------------|----------------------|------------|----------------------------------|
| Client                | API Gateway          | HTTPS      | All client requests              |
| API Gateway           | User Service         | HTTP/gRPC  | Auth & user operations           |
| API Gateway           | Product Service      | HTTP/gRPC  | Product catalog queries          |
| API Gateway           | Image Processing Svc | HTTP       | Image upload & management        |
| Image Processing Svc  | AI Model Service     | HTTP/gRPC  | ML inference requests            |
| All Services          | PostgreSQL           | TCP        | Data persistence                 |
| All Services          | Redis                | TCP        | Caching & message queue          |
| All Services          | MinIO                | HTTP       | Object storage                   |

### Service Discovery & Health

Each microservice exposes:
- `GET /health` — Liveness probe
- `GET /ready` — Readiness probe (checks dependencies)
- `GET /metrics` — Prometheus metrics endpoint

### Error Handling Strategy

```
┌─────────────────────────────────────────────┐
│            Error Handling Flow               │
├─────────────────────────────────────────────┤
│                                             │
│  1. Client Error (4xx)                      │
│     → Return descriptive error message      │
│     → Log at WARN level                     │
│                                             │
│  2. Server Error (5xx)                      │
│     → Retry with exponential backoff        │
│     → Circuit breaker after 5 failures      │
│     → Fallback to cached result if available│
│     → Log at ERROR level + alert            │
│                                             │
│  3. AI Model Error                          │
│     → Retry inference up to 3 times         │
│     → Fall back to simpler model            │
│     → Return "processing failed" status     │
│     → Queue for manual review               │
│                                             │
│  4. Timeout Handling                        │
│     → AI inference timeout: 60 seconds      │
│     → API request timeout: 30 seconds       │
│     → Client polling interval: 2 seconds    │
│                                             │
└─────────────────────────────────────────────┘
```
