# Virtual Try-On API Design

## Base URL
```
Production:  https://api.example.com/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication
All endpoints (except public product listing) require JWT Bearer token:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Image Upload API

### POST /api/v1/images/upload

Upload a user photo or product image for try-on processing.

**Request:**
```
Content-Type: multipart/form-data
```

| Field       | Type   | Required | Description                                |
|-------------|--------|----------|--------------------------------------------|
| file        | File   | Yes      | Image file (JPEG, PNG, WebP)               |
| image_type  | String | Yes      | "user_photo" or "product_image"            |
| product_id  | String | No       | Required if image_type is "product_image"  |

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "image_id": "img_abc123",
    "url": "https://storage.example.com/images/img_abc123.jpg",
    "thumbnail_url": "https://storage.example.com/thumbnails/img_abc123.jpg",
    "image_type": "user_photo",
    "dimensions": {
      "width": 768,
      "height": 1024
    },
    "file_size_bytes": 245760,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
```json
// 400 Bad Request - Invalid image
{
  "status": "error",
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Image must be JPEG, PNG, or WebP format",
    "details": {
      "received_type": "image/gif",
      "allowed_types": ["image/jpeg", "image/png", "image/webp"]
    }
  }
}

// 413 Payload Too Large
{
  "status": "error",
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Image file size must not exceed 10MB",
    "details": {
      "max_size_bytes": 10485760,
      "received_size_bytes": 15728640
    }
  }
}
```

### GET /api/v1/images/{image_id}

Retrieve image metadata.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "image_id": "img_abc123",
    "url": "https://storage.example.com/images/img_abc123.jpg",
    "image_type": "user_photo",
    "dimensions": { "width": 768, "height": 1024 },
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### DELETE /api/v1/images/{image_id}

Delete an uploaded image.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Image deleted successfully"
}
```

---

## 2. Try-On Generation API

### POST /api/v1/tryon/generate

Generate a virtual try-on image.

**Request:**
```json
{
  "user_image_id": "img_abc123",
  "product_image_id": "img_def456",
  "product_id": "prod_789",
  "options": {
    "output_resolution": "high",
    "preserve_background": true,
    "adjust_lighting": true
  }
}
```

| Field            | Type   | Required | Description                              |
|------------------|--------|----------|------------------------------------------|
| user_image_id    | String | Yes      | ID of uploaded user photo                |
| product_image_id | String | Yes      | ID of product/garment image              |
| product_id       | String | No       | Product catalog ID for metadata          |
| options          | Object | No       | Generation options                       |

**Response (202 Accepted):**
```json
{
  "status": "success",
  "data": {
    "job_id": "job_xyz789",
    "status": "queued",
    "estimated_time_seconds": 15,
    "created_at": "2025-01-15T10:30:00Z",
    "poll_url": "/api/v1/tryon/status/job_xyz789"
  }
}
```

### GET /api/v1/tryon/status/{job_id}

Check the status of a try-on generation job.

**Response (200 OK) - Processing:**
```json
{
  "status": "success",
  "data": {
    "job_id": "job_xyz789",
    "status": "processing",
    "progress": 65,
    "current_step": "garment_warping",
    "steps": [
      { "name": "pose_estimation", "status": "completed", "duration_ms": 1200 },
      { "name": "body_segmentation", "status": "completed", "duration_ms": 800 },
      { "name": "garment_warping", "status": "in_progress", "duration_ms": null },
      { "name": "image_synthesis", "status": "pending", "duration_ms": null }
    ]
  }
}
```

**Response (200 OK) - Completed:**
```json
{
  "status": "success",
  "data": {
    "job_id": "job_xyz789",
    "status": "completed",
    "progress": 100,
    "result": {
      "image_url": "https://storage.example.com/results/job_xyz789.jpg",
      "thumbnail_url": "https://storage.example.com/results/thumb_job_xyz789.jpg",
      "dimensions": { "width": 768, "height": 1024 },
      "metadata": {
        "pose_confidence": 0.95,
        "segmentation_quality": 0.92,
        "overall_quality_score": 0.88
      }
    },
    "processing_time_ms": 8500,
    "completed_at": "2025-01-15T10:30:08Z"
  }
}
```

### GET /api/v1/tryon/result/{job_id}

Get the final try-on result (redirects to image URL).

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "job_id": "job_xyz789",
    "result_url": "https://storage.example.com/results/job_xyz789.jpg",
    "user_image_url": "https://storage.example.com/images/img_abc123.jpg",
    "product_image_url": "https://storage.example.com/images/img_def456.jpg",
    "quality_score": 0.88,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### GET /api/v1/tryon/history

Get user's try-on history.

**Query Parameters:**

| Param    | Type    | Default | Description              |
|----------|---------|---------|--------------------------|
| page     | Integer | 1       | Page number              |
| per_page | Integer | 20      | Results per page         |
| sort_by  | String  | created_at | Sort field            |
| order    | String  | desc    | Sort order (asc/desc)    |

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "job_id": "job_xyz789",
        "result_url": "https://storage.example.com/results/job_xyz789.jpg",
        "product_name": "Summer Floral Dress",
        "quality_score": 0.88,
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total_items": 45,
      "total_pages": 3
    }
  }
}
```

---

## 3. Product API

### GET /api/v1/products

List products available for try-on.

**Query Parameters:**

| Param    | Type    | Default | Description              |
|----------|---------|---------|--------------------------|
| category | String  | null    | Filter by category       |
| page     | Integer | 1       | Page number              |
| per_page | Integer | 20      | Results per page         |
| search   | String  | null    | Search by name           |

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "product_id": "prod_789",
        "name": "Summer Floral Dress",
        "category": "dresses",
        "price": 59.99,
        "image_url": "https://storage.example.com/products/prod_789.jpg",
        "tryon_compatible": true
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total_items": 150,
      "total_pages": 8
    }
  }
}
```

### GET /api/v1/products/{product_id}

Get product details.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "product_id": "prod_789",
    "name": "Summer Floral Dress",
    "description": "A beautiful floral print summer dress",
    "category": "dresses",
    "subcategory": "casual",
    "price": 59.99,
    "sizes": ["XS", "S", "M", "L", "XL"],
    "colors": ["blue", "red", "green"],
    "images": [
      {
        "image_id": "img_def456",
        "url": "https://storage.example.com/products/prod_789_front.jpg",
        "type": "front"
      }
    ],
    "tryon_compatible": true,
    "garment_metadata": {
      "type": "upper_lower",
      "sleeve_length": "short",
      "neckline": "v-neck"
    }
  }
}
```

---

## 4. User API

### POST /api/v1/users/register
### POST /api/v1/users/login
### GET /api/v1/users/profile
### PUT /api/v1/users/profile
### POST /api/v1/users/upload-photo

(See SYSTEM_DESIGN.md for User Service LLD details)

---

## Error Code Reference

| Code                  | HTTP Status | Description                            |
|-----------------------|-------------|----------------------------------------|
| INVALID_IMAGE         | 400         | Image format not supported             |
| INVALID_REQUEST       | 400         | Missing or invalid request parameters  |
| FILE_TOO_LARGE        | 413         | Image exceeds max file size            |
| UNAUTHORIZED          | 401         | Missing or invalid auth token          |
| FORBIDDEN             | 403         | Insufficient permissions               |
| NOT_FOUND             | 404         | Resource not found                     |
| JOB_FAILED            | 500         | Try-on generation failed               |
| MODEL_UNAVAILABLE     | 503         | AI model not available                 |
| RATE_LIMITED          | 429         | Too many requests                      |

## Rate Limits

| Endpoint              | Limit              | Window   |
|-----------------------|--------------------|----------|
| Image Upload          | 10 requests        | 1 minute |
| Try-On Generate       | 5 requests         | 1 minute |
| Status Polling        | 60 requests        | 1 minute |
| Product Listing       | 100 requests       | 1 minute |
