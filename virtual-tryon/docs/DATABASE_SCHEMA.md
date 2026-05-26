# Virtual Try-On Database Schema

## Overview

PostgreSQL is used as the primary relational database for storing user data,
product catalog, image metadata, and try-on job records. Binary image data
is stored in MinIO (S3-compatible object storage), with only URLs/paths
stored in PostgreSQL.

---

## Entity Relationship Diagram

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│    users     │     │   user_images     │     │   tryon_jobs     │
├──────────────┤     ├───────────────────┤     ├──────────────────┤
│ id (PK)      │────<│ id (PK)           │  ┌─>│ id (PK)          │
│ email        │     │ user_id (FK)      │  │  │ user_id (FK)     │
│ name         │     │ image_url         │  │  │ user_image_id(FK)│
│ created_at   │     │ thumbnail_url     │  │  │ product_image_id │
│ updated_at   │     │ image_type        │  │  │ product_id (FK)  │
└──────────────┘     │ width             │  │  │ status           │
                     │ height            │  │  │ progress         │
                     │ file_size_bytes   │  │  │ result_image_url │
                     │ storage_path      │  │  │ quality_score    │
                     │ created_at        │  │  │ processing_time  │
                     └───────────────────┘  │  │ error_message    │
                                            │  │ created_at       │
┌──────────────┐     ┌───────────────────┐  │  │ completed_at     │
│  categories  │     │    products       │  │  └──────────────────┘
├──────────────┤     ├───────────────────┤  │
│ id (PK)      │────<│ id (PK)           │  │  ┌──────────────────┐
│ name         │     │ name              │  │  │  tryon_results   │
│ parent_id(FK)│     │ description       │  │  ├──────────────────┤
│ created_at   │     │ category_id (FK)  │  │  │ id (PK)          │
└──────────────┘     │ price             │──┘  │ job_id (FK)      │
                     │ sizes (JSON)      │     │ result_image_url │
                     │ colors (JSON)     │     │ thumbnail_url    │
                     │ tryon_compatible  │     │ pose_confidence  │
                     │ garment_type      │     │ seg_quality      │
                     │ created_at        │     │ overall_score    │
                     │ updated_at        │     │ metadata (JSON)  │
                     └───────┬───────────┘     │ created_at       │
                             │                 └──────────────────┘
                     ┌───────┴───────────┐
                     │  product_images   │
                     ├───────────────────┤
                     │ id (PK)           │
                     │ product_id (FK)   │
                     │ image_url         │
                     │ thumbnail_url     │
                     │ image_type        │
                     │ storage_path      │
                     │ is_primary        │
                     │ created_at        │
                     └───────────────────┘
```

---

## Table Definitions

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### user_images
```sql
CREATE TABLE user_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    image_type VARCHAR(50) NOT NULL DEFAULT 'full_body',
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_images_user_id ON user_images(user_id);
CREATE INDEX idx_user_images_type ON user_images(image_type);
```

### categories
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
```

### products
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) NOT NULL,
    sizes JSONB DEFAULT '[]',
    colors JSONB DEFAULT '[]',
    tryon_compatible BOOLEAN DEFAULT true,
    garment_type VARCHAR(50) NOT NULL DEFAULT 'upper_body',
    garment_metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_garment_type ON products(garment_type);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
```

### product_images
```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    image_type VARCHAR(50) NOT NULL DEFAULT 'front',
    storage_path VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary)
    WHERE is_primary = true;
```

### tryon_jobs
```sql
CREATE TABLE tryon_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_image_id UUID NOT NULL REFERENCES user_images(id),
    product_image_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    current_step VARCHAR(50),
    options JSONB DEFAULT '{}',
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_status CHECK (
        status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_tryon_jobs_user ON tryon_jobs(user_id);
CREATE INDEX idx_tryon_jobs_status ON tryon_jobs(status);
CREATE INDEX idx_tryon_jobs_created ON tryon_jobs(created_at DESC);
```

### tryon_results
```sql
CREATE TABLE tryon_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE NOT NULL REFERENCES tryon_jobs(id) ON DELETE CASCADE,
    result_image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    storage_path VARCHAR(500) NOT NULL,
    pose_confidence FLOAT,
    segmentation_quality FLOAT,
    overall_quality_score FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tryon_results_job ON tryon_results(job_id);
```

---

## Cache Schema (Redis)

```
# Try-on result cache (keyed by hash of input images)
tryon:cache:{sha256_hash} -> {
    "job_id": "uuid",
    "result_url": "https://...",
    "quality_score": 0.88
}
TTL: 3600 seconds (1 hour)

# Job status (for polling)
tryon:job:{job_id} -> {
    "status": "processing",
    "progress": 65,
    "current_step": "garment_warping"
}
TTL: 86400 seconds (24 hours)

# Rate limiting
ratelimit:upload:{user_id} -> counter
TTL: 60 seconds

ratelimit:tryon:{user_id} -> counter
TTL: 60 seconds

# User session
session:{user_id} -> {
    "token": "jwt_token",
    "last_active": "timestamp"
}
TTL: 86400 seconds (24 hours)
```

---

## Migration Strategy

Migrations are managed using Alembic (SQLAlchemy migration tool).

```bash
# Generate new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```
