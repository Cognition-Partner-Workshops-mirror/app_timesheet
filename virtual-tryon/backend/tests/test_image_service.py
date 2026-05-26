"""
Tests for the image processing service.
Validates image resizing, thumbnail generation, hash computation,
and storage path generation functions.
"""

import io
import pytest
from PIL import Image

from app.services.image_service import (
    resize_image,
    generate_thumbnail,
    compute_image_hash,
    generate_storage_path,
    get_image_dimensions,
)


def _create_test_image(width: int = 800, height: int = 1200, color: str = "red") -> bytes:
    """Helper: create a JPEG image in memory and return its bytes."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ── resize_image tests ──

def test_resize_image_outputs_correct_dimensions():
    """Resized image should match the target width and height."""
    content = _create_test_image(1600, 2400)
    resized = resize_image(content, target_width=768, target_height=1024)

    img = Image.open(io.BytesIO(resized))
    assert img.size == (768, 1024), f"Expected (768, 1024) but got {img.size}"


def test_resize_image_handles_wide_image():
    """Wide images should be letter-boxed to preserve aspect ratio."""
    content = _create_test_image(2000, 500)
    resized = resize_image(content, target_width=768, target_height=1024)

    img = Image.open(io.BytesIO(resized))
    assert img.size == (768, 1024)


def test_resize_image_handles_rgba():
    """RGBA images should be converted to RGB before processing."""
    img = Image.new("RGBA", (800, 1200), (255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    content = buf.getvalue()

    resized = resize_image(content, target_width=768, target_height=1024)
    result = Image.open(io.BytesIO(resized))
    assert result.mode == "RGB"
    assert result.size == (768, 1024)


def test_resize_image_returns_bytes():
    """resize_image should return bytes that represent a valid JPEG."""
    content = _create_test_image()
    resized = resize_image(content)
    assert isinstance(resized, bytes)
    assert len(resized) > 0

    # Verify it's a valid image
    img = Image.open(io.BytesIO(resized))
    img.verify()


# ── generate_thumbnail tests ──

def test_generate_thumbnail_is_square():
    """Thumbnail should be a square image of the requested size."""
    content = _create_test_image(800, 1200)
    thumb = generate_thumbnail(content, size=256)

    img = Image.open(io.BytesIO(thumb))
    assert img.size == (256, 256)


def test_generate_thumbnail_custom_size():
    """Thumbnail should respect a non-default size argument."""
    content = _create_test_image(800, 1200)
    thumb = generate_thumbnail(content, size=128)

    img = Image.open(io.BytesIO(thumb))
    assert img.size == (128, 128)


def test_generate_thumbnail_wide_image():
    """Thumbnail from a wide image should still produce a square crop."""
    content = _create_test_image(2000, 500)
    thumb = generate_thumbnail(content, size=256)

    img = Image.open(io.BytesIO(thumb))
    assert img.size == (256, 256)


# ── compute_image_hash tests ──

def test_compute_image_hash_deterministic():
    """Same content should always produce the same hash."""
    content = _create_test_image(100, 100)
    h1 = compute_image_hash(content)
    h2 = compute_image_hash(content)
    assert h1 == h2


def test_compute_image_hash_different_for_different_content():
    """Different images should produce different hashes."""
    c1 = _create_test_image(100, 100, "red")
    c2 = _create_test_image(100, 100, "blue")
    assert compute_image_hash(c1) != compute_image_hash(c2)


def test_compute_image_hash_is_hex():
    """Hash should be a 64-character hex string (SHA-256)."""
    content = _create_test_image(100, 100)
    h = compute_image_hash(content)
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


# ── get_image_dimensions tests ──

def test_get_image_dimensions():
    """Should return (width, height) tuple."""
    content = _create_test_image(800, 1200)
    w, h = get_image_dimensions(content)
    assert w == 800
    assert h == 1200


# ── generate_storage_path tests ──

def test_generate_storage_path_format():
    """Path should follow {type}/{uuid}.{ext} format."""
    path = generate_storage_path("user_image", "jpg")
    parts = path.split("/")
    assert len(parts) == 2
    assert parts[0] == "user_image"
    assert parts[1].endswith(".jpg")


def test_generate_storage_path_uniqueness():
    """Each call should produce a unique path."""
    p1 = generate_storage_path("user_image")
    p2 = generate_storage_path("user_image")
    assert p1 != p2


def test_generate_storage_path_custom_extension():
    """Storage path should use the specified extension."""
    path = generate_storage_path("product_image", "png")
    assert path.endswith(".png")
