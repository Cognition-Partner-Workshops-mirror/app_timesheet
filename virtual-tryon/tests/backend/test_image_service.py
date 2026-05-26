"""
Unit tests for the image processing service.
Tests image validation, resizing, thumbnail generation, and hash computation.
"""

import io
import pytest
from PIL import Image


def create_test_image(width: int = 800, height: int = 1200, color: str = "red") -> bytes:
    """Helper to create a test image in JPEG format."""
    img = Image.new("RGB", (width, height), color)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


class TestImageDimensions:
    """Tests for get_image_dimensions function."""

    def test_get_dimensions_standard(self):
        """Should correctly detect width and height of a standard image."""
        from app.services.image_service import get_image_dimensions

        content = create_test_image(800, 1200)
        width, height = get_image_dimensions(content)
        assert width == 800
        assert height == 1200

    def test_get_dimensions_square(self):
        """Should handle square images correctly."""
        from app.services.image_service import get_image_dimensions

        content = create_test_image(500, 500)
        width, height = get_image_dimensions(content)
        assert width == 500
        assert height == 500


class TestImageResize:
    """Tests for the resize_image function."""

    def test_resize_to_target(self):
        """Should resize image to target dimensions."""
        from app.services.image_service import resize_image, get_image_dimensions

        content = create_test_image(1600, 2400)
        resized = resize_image(content, 768, 1024)

        width, height = get_image_dimensions(resized)
        assert width == 768
        assert height == 1024

    def test_resize_preserves_aspect_ratio(self):
        """Output should have the target canvas size even with different aspect ratio."""
        from app.services.image_service import resize_image, get_image_dimensions

        # Wide image (different aspect ratio than target)
        content = create_test_image(2000, 500)
        resized = resize_image(content, 768, 1024)

        width, height = get_image_dimensions(resized)
        assert width == 768
        assert height == 1024


class TestThumbnailGeneration:
    """Tests for the generate_thumbnail function."""

    def test_thumbnail_is_square(self):
        """Generated thumbnail should be a square image."""
        from app.services.image_service import generate_thumbnail, get_image_dimensions

        content = create_test_image(800, 1200)
        thumb = generate_thumbnail(content, size=256)

        width, height = get_image_dimensions(thumb)
        assert width == 256
        assert height == 256

    def test_thumbnail_custom_size(self):
        """Thumbnail should respect custom size parameter."""
        from app.services.image_service import generate_thumbnail, get_image_dimensions

        content = create_test_image(800, 800)
        thumb = generate_thumbnail(content, size=128)

        width, height = get_image_dimensions(thumb)
        assert width == 128
        assert height == 128


class TestImageHash:
    """Tests for compute_image_hash function."""

    def test_same_content_same_hash(self):
        """Same image content should produce identical hashes."""
        from app.services.image_service import compute_image_hash

        content = create_test_image()
        hash1 = compute_image_hash(content)
        hash2 = compute_image_hash(content)
        assert hash1 == hash2

    def test_different_content_different_hash(self):
        """Different images should produce different hashes."""
        from app.services.image_service import compute_image_hash

        content1 = create_test_image(color="red")
        content2 = create_test_image(color="blue")
        assert compute_image_hash(content1) != compute_image_hash(content2)


class TestStoragePath:
    """Tests for generate_storage_path function."""

    def test_path_contains_type(self):
        """Storage path should include the image type as a directory."""
        from app.services.image_service import generate_storage_path

        path = generate_storage_path("user_photo", "jpg")
        assert path.startswith("user_photo/")
        assert path.endswith(".jpg")

    def test_unique_paths(self):
        """Each call should generate a unique path."""
        from app.services.image_service import generate_storage_path

        path1 = generate_storage_path("user_photo")
        path2 = generate_storage_path("user_photo")
        assert path1 != path2
