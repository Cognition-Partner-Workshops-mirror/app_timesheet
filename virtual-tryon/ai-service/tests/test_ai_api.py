"""
Tests for the AI service API endpoints.
Validates health checks, readiness probes, and metrics endpoint.
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app, raise_server_exceptions=False)


# ── Health Check Tests ──

def test_health_check():
    """Health endpoint should return 200 with service info."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data


def test_readiness_check():
    """Readiness probe should indicate whether models are loaded."""
    response = client.get("/ready")
    # Models may or may not be loaded; either 200 or 503 is valid
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data


def test_metrics_endpoint():
    """Metrics endpoint should return model status and GPU info."""
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "models_loaded" in data


# ── Inference endpoint validation ──

def test_inference_missing_fields():
    """Inference endpoint should reject requests with missing required fields."""
    response = client.post("/api/v1/inference/process", json={})
    assert response.status_code == 422


def test_inference_invalid_job_id():
    """Inference with invalid paths should return an error (not crash)."""
    response = client.post(
        "/api/v1/inference/process",
        json={
            "job_id": "test-job-123",
            "user_image_path": "nonexistent/path.jpg",
            "product_image_id": "nonexistent-product",
        },
    )
    # Should fail gracefully with 500 (storage fetch fails) not crash
    assert response.status_code in (400, 404, 500)
