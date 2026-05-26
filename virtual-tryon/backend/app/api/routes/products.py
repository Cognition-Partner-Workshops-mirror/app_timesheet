"""
Product catalog API routes.
Handles CRUD operations for products available for virtual try-on.
Supports filtering by category, search, and pagination.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user_id
from app.database.connection import get_db
from app.database.models import Product, ProductImage, Category
from app.models.schemas import (
    ProductCreateRequest,
    ProductResponse,
    ProductListResponse,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = Query(None, description="Filter by category slug"),
    search: Optional[str] = Query(None, description="Search by product name"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """
    List products available for virtual try-on.
    Supports category filtering, text search, and pagination.
    Only active, try-on compatible products are returned.
    """
    # Base query: only active, try-on compatible products
    base_query = select(Product).where(
        Product.is_active == True,
        Product.tryon_compatible == True,
    )

    # Apply category filter if provided
    if category:
        base_query = base_query.join(Category).where(Category.slug == category)

    # Apply search filter if provided
    if search:
        base_query = base_query.where(Product.name.ilike(f"%{search}%"))

    # Count total matching products for pagination
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total_items = total_result.scalar()

    # Fetch paginated results with eager-loaded images
    offset = (page - 1) * per_page
    query = (
        base_query
        .options(selectinload(Product.images))
        .order_by(Product.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(query)
    products = result.scalars().all()

    # Transform to response schema
    items = []
    for product in products:
        primary_image = next(
            (img for img in product.images if img.is_primary),
            product.images[0] if product.images else None,
        )
        items.append(
            ProductResponse(
                product_id=product.id,
                name=product.name,
                description=product.description,
                category=None,  # Would join category name in production
                price=float(product.price),
                sizes=product.sizes or [],
                colors=product.colors or [],
                tryon_compatible=product.tryon_compatible,
                garment_type=product.garment_type,
                images=[
                    {
                        "image_id": str(img.id),
                        "url": img.image_url,
                        "type": img.image_type,
                        "is_primary": img.is_primary,
                    }
                    for img in product.images
                ],
            )
        )

    return ProductListResponse(
        items=items,
        pagination={
            "page": page,
            "per_page": per_page,
            "total_items": total_items,
            "total_pages": (total_items + per_page - 1) // per_page if total_items else 0,
        },
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed information about a specific product."""
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.images))
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return ProductResponse(
        product_id=product.id,
        name=product.name,
        description=product.description,
        category=None,
        price=float(product.price),
        sizes=product.sizes or [],
        colors=product.colors or [],
        tryon_compatible=product.tryon_compatible,
        garment_type=product.garment_type,
        images=[
            {
                "image_id": str(img.id),
                "url": img.image_url,
                "type": img.image_type,
                "is_primary": img.is_primary,
            }
            for img in product.images
        ],
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    request: ProductCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new product in the catalog (admin operation).
    Requires authentication. Product is marked as try-on compatible by default.
    """
    product = Product(
        name=request.name,
        description=request.description,
        category_id=request.category_id,
        price=request.price,
        sizes=request.sizes,
        colors=request.colors,
        garment_type=request.garment_type,
        garment_metadata=request.garment_metadata,
        tryon_compatible=True,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)

    return ProductResponse(
        product_id=product.id,
        name=product.name,
        description=product.description,
        category=None,
        price=float(product.price),
        sizes=product.sizes or [],
        colors=product.colors or [],
        tryon_compatible=product.tryon_compatible,
        garment_type=product.garment_type,
        images=[],
    )
