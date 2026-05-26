"""
Tests for the backend API endpoints.
Uses TestClient to verify health checks, user registration/login,
and product listing without requiring external services.
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app, raise_server_exceptions=False)


# ── Health Check Tests ──

def test_health_check():
    """Health endpoint should return 200 with service status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_readiness_check():
    """Readiness endpoint should return 200."""
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


# ── Swagger Docs Tests ──

def test_swagger_docs_accessible():
    """Swagger UI should be accessible at /docs."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_accessible():
    """ReDoc should be accessible at /redoc."""
    response = client.get("/redoc")
    assert response.status_code == 200


# ── User Registration Tests ──

def test_register_user_missing_email():
    """Registration without email should return 422 validation error."""
    response = client.post("/api/v1/users/register", json={"name": "Test"})
    assert response.status_code == 422


def test_login_user_missing_email():
    """Login without email should return 422 validation error."""
    response = client.post("/api/v1/users/login", json={})
    assert response.status_code == 422


# ── Product Catalog Tests ──

def test_get_products_requires_no_auth():
    """Product listing should be accessible without authentication."""
    response = client.get("/api/v1/products")
    # Should return 200 with empty list (no products seeded)
    assert response.status_code == 200


# ── Try-On Tests ──

def test_tryon_generate_requires_auth():
    """Try-on generation should require authentication."""
    response = client.post(
        "/api/v1/tryon/generate",
        json={
            "user_image_id": "00000000-0000-0000-0000-000000000001",
            "product_image_id": "00000000-0000-0000-0000-000000000002",
        },
    )
    # Should return 401 or 403 because no JWT token was provided
    assert response.status_code in (401, 403)


def test_tryon_status_requires_auth():
    """Try-on status check should require authentication."""
    response = client.get("/api/v1/tryon/status/00000000-0000-0000-0000-000000000001")
    assert response.status_code in (401, 403)


def test_tryon_history_requires_auth():
    """Try-on history should require authentication."""
    response = client.get("/api/v1/tryon/history")
    assert response.status_code in (401, 403)


# ── Image Upload Tests ──

def test_image_upload_requires_auth():
    """Image upload should require authentication."""
    response = client.post("/api/v1/images/upload")
    assert response.status_code in (401, 403, 422)
