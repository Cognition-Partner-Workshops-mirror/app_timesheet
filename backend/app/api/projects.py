"""
Project management API endpoints.
Handles CRUD operations for projects, image/doc uploads, and AI generation.
"""

import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import (
    ALLOWED_DOC_EXTENSIONS,
    ALLOWED_IMAGE_EXTENSIONS,
    IMAGES_DIR,
    MAX_UPLOAD_SIZE,
    REQUIREMENTS_DIR,
)
from app.models.schemas import (
    AddServiceRequest,
    GenerateHLDRequest,
    GenerateLLDRequest,
    HLD,
    LLD,
    Project,
    ProjectCreateRequest,
    ProjectSummary,
    ProjectUpdateRequest,
    RequirementDoc,
    UpdateHLDRequest,
    UpdateLLDRequest,
    UpdateServiceRequest,
    UploadedImage,
)
from app.services import ai_service, storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects"])


# ---- Project CRUD ----

@router.get("", response_model=list[ProjectSummary])
async def list_projects():
    """List all projects with summary information."""
    return storage.list_projects()


@router.post("", response_model=Project)
async def create_project(req: ProjectCreateRequest):
    """Create a new project."""
    project = Project(
        name=req.name,
        description=req.description,
        target_scale=req.target_scale,
        primary_language=req.primary_language,
        cloud_provider=req.cloud_provider,
    )
    storage.save_project(project)
    logger.info("Created project %s: %s", project.id, project.name)
    return project


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get full project details by ID."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, req: ProjectUpdateRequest):
    """Update project metadata."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if req.name is not None:
        project.name = req.name
    if req.description is not None:
        project.description = req.description
    if req.target_scale is not None:
        project.target_scale = req.target_scale
    if req.primary_language is not None:
        project.primary_language = req.primary_language
    if req.cloud_provider is not None:
        project.cloud_provider = req.cloud_provider

    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project and its associated files."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clean up uploaded files
    for img in project.images:
        img_path = IMAGES_DIR / img.filename
        if img_path.exists():
            img_path.unlink()

    for req_doc in project.requirements:
        if req_doc.filename:
            doc_path = REQUIREMENTS_DIR / req_doc.filename
            if doc_path.exists():
                doc_path.unlink()

    storage.delete_project(project_id)
    logger.info("Deleted project %s", project_id)
    return {"message": "Project deleted"}


# ---- Image Upload & Analysis ----

@router.post("/{project_id}/images", response_model=UploadedImage)
async def upload_image(
    project_id: str,
    file: UploadFile = File(...),
    endpoint: str = Form(""),
    description: str = Form(""),
):
    """Upload a UI design image and optionally trigger AI analysis."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image format. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    # Save file with unique name
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = IMAGES_DIR / unique_name
    save_path.write_bytes(contents)

    # Create image record
    image = UploadedImage(
        filename=unique_name,
        original_name=file.filename or "unnamed",
        endpoint=endpoint,
        description=description,
    )

    # Run AI analysis on the image
    try:
        analysis_result = ai_service.analyze_image(str(save_path), endpoint)
        image.ai_analysis = analysis_result.get("analysis", "")
    except Exception as e:
        logger.warning("Image analysis failed for %s: %s", file.filename, str(e))
        image.ai_analysis = f"Analysis unavailable: {str(e)}"

    project.images.append(image)
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    logger.info("Uploaded image %s for project %s", image.id, project_id)
    return image


@router.delete("/{project_id}/images/{image_id}")
async def delete_image(project_id: str, image_id: str):
    """Remove an uploaded image from the project."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    image = next((i for i in project.images if i.id == image_id), None)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete file from disk
    img_path = IMAGES_DIR / image.filename
    if img_path.exists():
        img_path.unlink()

    project.images = [i for i in project.images if i.id != image_id]
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return {"message": "Image deleted"}


# ---- Requirements Upload ----

@router.post("/{project_id}/requirements", response_model=RequirementDoc)
async def upload_requirement(
    project_id: str,
    file: Optional[UploadFile] = File(None),
    content: str = Form(""),
    title: str = Form(""),
):
    """Upload a requirements document or provide text content directly."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req_doc = RequirementDoc()

    if file and file.filename:
        # Validate extension
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_DOC_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document format. Allowed: {', '.join(ALLOWED_DOC_EXTENSIONS)}",
            )

        file_contents = await file.read()
        if len(file_contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

        unique_name = f"{uuid.uuid4().hex}{ext}"
        save_path = REQUIREMENTS_DIR / unique_name
        save_path.write_bytes(file_contents)

        # Try to extract text content from the file
        try:
            text_content = file_contents.decode("utf-8")
        except UnicodeDecodeError:
            text_content = f"[Binary file: {file.filename}]"

        req_doc.filename = unique_name
        req_doc.original_name = file.filename
        req_doc.content = text_content
    elif content:
        req_doc.original_name = title or "Manual Input"
        req_doc.content = content
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either a file or text content",
        )

    project.requirements.append(req_doc)
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    logger.info("Added requirement %s to project %s", req_doc.id, project_id)
    return req_doc


@router.delete("/{project_id}/requirements/{req_id}")
async def delete_requirement(project_id: str, req_id: str):
    """Remove a requirements document from the project."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req_doc = next((r for r in project.requirements if r.id == req_id), None)
    if not req_doc:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if req_doc.filename:
        doc_path = REQUIREMENTS_DIR / req_doc.filename
        if doc_path.exists():
            doc_path.unlink()

    project.requirements = [r for r in project.requirements if r.id != req_id]
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return {"message": "Requirement deleted"}


@router.put("/{project_id}/requirements/{req_id}", response_model=RequirementDoc)
async def update_requirement(
    project_id: str,
    req_id: str,
    content: str = Form(""),
    title: str = Form(""),
):
    """Update the content of a requirements document."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req_doc = next((r for r in project.requirements if r.id == req_id), None)
    if not req_doc:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if content:
        req_doc.content = content
    if title:
        req_doc.original_name = title

    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return req_doc


# ---- HLD Generation & Management ----

@router.post("/{project_id}/hld/generate", response_model=HLD)
async def generate_hld(project_id: str, req: GenerateHLDRequest):
    """Generate or regenerate the High-Level Design using AI."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.images and not project.requirements:
        raise HTTPException(
            status_code=400,
            detail="Upload at least one image or requirement before generating HLD",
        )

    try:
        hld = ai_service.generate_hld(project, req.additional_context)
        project.hld = hld
        project.updated_at = datetime.now().isoformat()
        storage.save_project(project)
        logger.info("Generated HLD for project %s", project_id)
        return hld
    except Exception as e:
        logger.error("HLD generation failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"HLD generation failed: {str(e)}")


@router.get("/{project_id}/hld", response_model=Optional[HLD])
async def get_hld(project_id: str):
    """Get the current HLD for a project."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.hld


@router.put("/{project_id}/hld", response_model=HLD)
async def update_hld(project_id: str, req: UpdateHLDRequest):
    """Manually update HLD content (for interactive editing)."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.hld:
        raise HTTPException(status_code=404, detail="No HLD generated yet")

    if req.raw_content is not None:
        project.hld.raw_content = req.raw_content
    if req.overview is not None:
        project.hld.overview = req.overview
    if req.architecture_overview is not None:
        project.hld.architecture_overview = req.architecture_overview
    if req.scalability_strategy is not None:
        project.hld.scalability_strategy = req.scalability_strategy
    if req.security_strategy is not None:
        project.hld.security_strategy = req.security_strategy
    if req.reliability_strategy is not None:
        project.hld.reliability_strategy = req.reliability_strategy
    if req.communication_patterns is not None:
        project.hld.communication_patterns = req.communication_patterns
    if req.deployment_strategy is not None:
        project.hld.deployment_strategy = req.deployment_strategy

    project.hld.last_modified = datetime.now().isoformat()
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return project.hld


# ---- Service Management ----

@router.post("/{project_id}/services", response_model=Project)
async def add_service(project_id: str, req: AddServiceRequest):
    """Add a new service to the HLD."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.hld:
        raise HTTPException(status_code=400, detail="Generate HLD first")

    from app.models.schemas import ServiceDefinition
    new_service = ServiceDefinition(
        name=req.name,
        service_type=req.service_type,
        description=req.description,
        technology_stack=req.technology_stack,
    )
    project.hld.services.append(new_service)
    project.hld.last_modified = datetime.now().isoformat()
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return project


@router.put("/{project_id}/services/{service_id}", response_model=Project)
async def update_service(project_id: str, service_id: str, req: UpdateServiceRequest):
    """Update a service definition in the HLD."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.hld:
        raise HTTPException(status_code=400, detail="No HLD generated yet")

    service = next((s for s in project.hld.services if s.id == service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if req.name is not None:
        service.name = req.name
    if req.service_type is not None:
        service.service_type = req.service_type
    if req.description is not None:
        service.description = req.description
    if req.responsibilities is not None:
        service.responsibilities = req.responsibilities
    if req.technology_stack is not None:
        service.technology_stack = req.technology_stack
    if req.endpoints is not None:
        service.endpoints = req.endpoints
    if req.dependencies is not None:
        service.dependencies = req.dependencies
    if req.database is not None:
        service.database = req.database
    if req.protocols is not None:
        service.protocols = req.protocols

    project.hld.last_modified = datetime.now().isoformat()
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return project


@router.delete("/{project_id}/services/{service_id}", response_model=Project)
async def delete_service(project_id: str, service_id: str):
    """Remove a service from the HLD."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.hld:
        raise HTTPException(status_code=400, detail="No HLD generated yet")

    project.hld.services = [s for s in project.hld.services if s.id != service_id]
    # Also remove associated LLD
    if service_id in project.llds:
        del project.llds[service_id]

    project.hld.last_modified = datetime.now().isoformat()
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return project


# ---- LLD Generation & Management ----

@router.post("/{project_id}/lld/generate", response_model=LLD)
async def generate_lld(project_id: str, req: GenerateLLDRequest):
    """Generate a Low-Level Design for a specific service."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.hld:
        raise HTTPException(status_code=400, detail="Generate HLD first")

    service = next((s for s in project.hld.services if s.id == req.service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found in HLD")

    existing_lld = project.llds.get(req.service_id) if not req.regenerate else None

    try:
        lld = ai_service.generate_lld(
            project, service, req.additional_context, existing_lld
        )
        project.llds[req.service_id] = lld
        service.lld_generated = True
        project.updated_at = datetime.now().isoformat()
        storage.save_project(project)
        logger.info("Generated LLD for service %s in project %s", service.name, project_id)
        return lld
    except Exception as e:
        logger.error("LLD generation failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"LLD generation failed: {str(e)}")


@router.get("/{project_id}/lld/{service_id}", response_model=Optional[LLD])
async def get_lld(project_id: str, service_id: str):
    """Get the LLD for a specific service."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    lld = project.llds.get(service_id)
    if not lld:
        raise HTTPException(status_code=404, detail="LLD not found for this service")
    return lld


@router.put("/{project_id}/lld/{service_id}", response_model=LLD)
async def update_lld(project_id: str, service_id: str, req: UpdateLLDRequest):
    """Manually update LLD content (for interactive editing)."""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    lld = project.llds.get(service_id)
    if not lld:
        raise HTTPException(status_code=404, detail="LLD not found for this service")

    if req.raw_content is not None:
        lld.raw_content = req.raw_content
    if req.component_diagram is not None:
        lld.component_diagram = req.component_diagram
    if req.class_design is not None:
        lld.class_design = req.class_design
    if req.database_schema is not None:
        lld.database_schema = req.database_schema
    if req.api_contracts is not None:
        lld.api_contracts = req.api_contracts
    if req.sequence_flows is not None:
        lld.sequence_flows = req.sequence_flows
    if req.error_handling is not None:
        lld.error_handling = req.error_handling
    if req.data_validation is not None:
        lld.data_validation = req.data_validation
    if req.caching_strategy is not None:
        lld.caching_strategy = req.caching_strategy
    if req.logging_monitoring is not None:
        lld.logging_monitoring = req.logging_monitoring
    if req.security_details is not None:
        lld.security_details = req.security_details

    lld.last_modified = datetime.now().isoformat()
    project.updated_at = datetime.now().isoformat()
    storage.save_project(project)

    return lld
