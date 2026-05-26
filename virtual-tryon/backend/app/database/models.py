"""
SQLAlchemy ORM models for the Virtual Try-On database schema.
Defines all tables: users, user_images, categories, products,
product_images, tryon_jobs, and tryon_results.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Numeric, CheckConstraint, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.connection import Base


def utcnow():
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class User(Base):
    """User account model for authentication and profile management."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    images = relationship("UserImage", back_populates="user", cascade="all, delete-orphan")
    tryon_jobs = relationship("TryOnJob", back_populates="user", cascade="all, delete-orphan")


class UserImage(Base):
    """Stores metadata for user-uploaded photos (full-body images for try-on)."""
    __tablename__ = "user_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    image_type = Column(String(50), nullable=False, default="full_body")
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    user = relationship("User", back_populates="images")

    __table_args__ = (
        Index("idx_user_images_user_id", "user_id"),
        Index("idx_user_images_type", "image_type"),
    )


class Category(Base):
    """Product category with hierarchical parent-child support."""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    products = relationship("Product", back_populates="category")
    children = relationship("Category", backref="parent", remote_side="Category.id")


class Product(Base):
    """Product catalog entry representing a garment available for virtual try-on."""
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    sizes = Column(JSON, default=list)
    colors = Column(JSON, default=list)
    tryon_compatible = Column(Boolean, default=True)
    garment_type = Column(String(50), nullable=False, default="upper_body")
    garment_metadata = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_products_category", "category_id"),
        Index("idx_products_garment_type", "garment_type"),
    )


class ProductImage(Base):
    """Product image metadata (front, back, detail views stored in object storage)."""
    __tablename__ = "product_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    image_type = Column(String(50), nullable=False, default="front")
    storage_path = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    product = relationship("Product", back_populates="images")

    __table_args__ = (
        Index("idx_product_images_product", "product_id"),
    )


class TryOnJob(Base):
    """
    Tracks a virtual try-on generation job through its lifecycle:
    queued -> processing -> completed/failed.
    """
    __tablename__ = "tryon_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_image_id = Column(UUID(as_uuid=True), ForeignKey("user_images.id"), nullable=False)
    product_image_id = Column(UUID(as_uuid=True), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default="queued")
    progress = Column(Integer, default=0)
    current_step = Column(String(50), nullable=True)
    options = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="tryon_jobs")
    result = relationship("TryOnResult", back_populates="job", uselist=False)

    __table_args__ = (
        CheckConstraint("status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')", name="chk_status"),
        CheckConstraint("progress >= 0 AND progress <= 100", name="chk_progress"),
        Index("idx_tryon_jobs_user", "user_id"),
        Index("idx_tryon_jobs_status", "status"),
    )


class TryOnResult(Base):
    """Stores the output of a completed virtual try-on generation job."""
    __tablename__ = "tryon_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("tryon_jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    result_image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    storage_path = Column(String(500), nullable=False)
    pose_confidence = Column(Float, nullable=True)
    segmentation_quality = Column(Float, nullable=True)
    overall_quality_score = Column(Float, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    job = relationship("TryOnJob", back_populates="result")

    __table_args__ = (
        Index("idx_tryon_results_job", "job_id"),
    )
