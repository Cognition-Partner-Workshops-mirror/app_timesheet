"""
Pydantic models for request/response schemas.
Defines the data structures used across the API.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DesignPatternCategory(str, Enum):
    """Categories of system design patterns for microservices."""
    STRUCTURAL = "structural"
    COMMUNICATION = "communication"
    DATA_MANAGEMENT = "data_management"
    RELIABILITY = "reliability"
    SECURITY = "security"
    OBSERVABILITY = "observability"
    DEPLOYMENT = "deployment"


class ServiceType(str, Enum):
    """Types of microservices in the architecture."""
    API_GATEWAY = "api_gateway"
    BACKEND_SERVICE = "backend_service"
    DATABASE_SERVICE = "database_service"
    AUTH_SERVICE = "auth_service"
    MESSAGING_SERVICE = "messaging_service"
    CACHE_SERVICE = "cache_service"
    CDN_SERVICE = "cdn_service"
    LOAD_BALANCER = "load_balancer"
    MONITORING_SERVICE = "monitoring_service"
    CUSTOM = "custom"


class UploadedImage(BaseModel):
    """Represents an uploaded UI design image."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    endpoint: str = ""
    description: str = ""
    upload_time: str = Field(default_factory=lambda: datetime.now().isoformat())
    # AI-extracted analysis of the image content
    ai_analysis: str = ""


class RequirementDoc(BaseModel):
    """Represents an uploaded or entered requirements document."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str = ""
    original_name: str = ""
    content: str = ""
    upload_time: str = Field(default_factory=lambda: datetime.now().isoformat())


class DesignPattern(BaseModel):
    """A design pattern recommendation for the architecture."""
    name: str
    category: DesignPatternCategory
    description: str
    rationale: str
    # Whether this pattern is applied in the current design
    applied: bool = True


class ServiceEndpoint(BaseModel):
    """An API endpoint within a service."""
    method: str = "GET"
    path: str = ""
    description: str = ""
    request_schema: str = ""
    response_schema: str = ""
    auth_required: bool = True


class ServiceDefinition(BaseModel):
    """Definition of a single microservice in the HLD."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    service_type: ServiceType = ServiceType.BACKEND_SERVICE
    description: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    technology_stack: list[str] = Field(default_factory=list)
    endpoints: list[ServiceEndpoint] = Field(default_factory=list)
    # Dependencies on other services (by service id)
    dependencies: list[str] = Field(default_factory=list)
    # Database/storage requirements
    database: str = ""
    # Communication protocols used
    protocols: list[str] = Field(default_factory=list)
    # Related uploaded images
    related_image_ids: list[str] = Field(default_factory=list)
    # Whether LLD has been generated for this service
    lld_generated: bool = False


class HLD(BaseModel):
    """High-Level Design document for the system."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    overview: str = ""
    # Architecture diagram description (textual)
    architecture_overview: str = ""
    services: list[ServiceDefinition] = Field(default_factory=list)
    design_patterns: list[DesignPattern] = Field(default_factory=list)
    # Non-functional requirements
    scalability_strategy: str = ""
    security_strategy: str = ""
    reliability_strategy: str = ""
    # Communication patterns between services
    communication_patterns: str = ""
    # Deployment strategy
    deployment_strategy: str = ""
    # Raw markdown content for full HLD document
    raw_content: str = ""
    generated_at: str = ""
    last_modified: str = ""


class LLD(BaseModel):
    """Low-Level Design document for a specific service."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str
    service_name: str = ""
    # Detailed component breakdown
    component_diagram: str = ""
    # Class/module structure
    class_design: str = ""
    # Database schema details
    database_schema: str = ""
    # API contract details
    api_contracts: str = ""
    # Sequence diagrams (textual description)
    sequence_flows: str = ""
    # Error handling strategy
    error_handling: str = ""
    # Data validation rules
    data_validation: str = ""
    # Caching strategy
    caching_strategy: str = ""
    # Logging and monitoring
    logging_monitoring: str = ""
    # Security implementation details
    security_details: str = ""
    # Raw markdown content for full LLD document
    raw_content: str = ""
    generated_at: str = ""
    last_modified: str = ""


class Project(BaseModel):
    """Top-level project containing all design artifacts."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    images: list[UploadedImage] = Field(default_factory=list)
    requirements: list[RequirementDoc] = Field(default_factory=list)
    hld: Optional[HLD] = None
    # Map of service_id -> LLD
    llds: dict[str, LLD] = Field(default_factory=dict)
    # Project-level settings
    target_scale: str = "medium"
    primary_language: str = "Java/Spring Boot"
    cloud_provider: str = "Cloud Agnostic"


# --- Request/Response schemas ---

class ProjectCreateRequest(BaseModel):
    """Request body for creating a new project."""
    name: str
    description: str = ""
    target_scale: str = "medium"
    primary_language: str = "Java/Spring Boot"
    cloud_provider: str = "Cloud Agnostic"


class ProjectUpdateRequest(BaseModel):
    """Request body for updating project metadata."""
    name: Optional[str] = None
    description: Optional[str] = None
    target_scale: Optional[str] = None
    primary_language: Optional[str] = None
    cloud_provider: Optional[str] = None


class GenerateHLDRequest(BaseModel):
    """Request body for generating or regenerating the HLD."""
    additional_context: str = ""
    # Whether to regenerate from scratch or refine existing
    regenerate: bool = False


class GenerateLLDRequest(BaseModel):
    """Request body for generating LLD for a specific service."""
    service_id: str
    additional_context: str = ""
    regenerate: bool = False


class UpdateHLDRequest(BaseModel):
    """Request body for manually updating the HLD content."""
    raw_content: Optional[str] = None
    overview: Optional[str] = None
    architecture_overview: Optional[str] = None
    scalability_strategy: Optional[str] = None
    security_strategy: Optional[str] = None
    reliability_strategy: Optional[str] = None
    communication_patterns: Optional[str] = None
    deployment_strategy: Optional[str] = None


class UpdateLLDRequest(BaseModel):
    """Request body for manually updating an LLD."""
    raw_content: Optional[str] = None
    component_diagram: Optional[str] = None
    class_design: Optional[str] = None
    database_schema: Optional[str] = None
    api_contracts: Optional[str] = None
    sequence_flows: Optional[str] = None
    error_handling: Optional[str] = None
    data_validation: Optional[str] = None
    caching_strategy: Optional[str] = None
    logging_monitoring: Optional[str] = None
    security_details: Optional[str] = None


class UpdateServiceRequest(BaseModel):
    """Request body for updating a service definition in the HLD."""
    name: Optional[str] = None
    service_type: Optional[ServiceType] = None
    description: Optional[str] = None
    responsibilities: Optional[list[str]] = None
    technology_stack: Optional[list[str]] = None
    endpoints: Optional[list[ServiceEndpoint]] = None
    dependencies: Optional[list[str]] = None
    database: Optional[str] = None
    protocols: Optional[list[str]] = None


class AddServiceRequest(BaseModel):
    """Request body for adding a new service to the HLD."""
    name: str
    service_type: ServiceType = ServiceType.BACKEND_SERVICE
    description: str = ""
    technology_stack: list[str] = Field(default_factory=list)


class ImageAnalysisResponse(BaseModel):
    """Response from AI image analysis."""
    image_id: str
    analysis: str
    detected_endpoints: list[str] = Field(default_factory=list)
    detected_components: list[str] = Field(default_factory=list)


class ProjectSummary(BaseModel):
    """Lightweight project summary for listing."""
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str
    image_count: int
    requirement_count: int
    has_hld: bool
    service_count: int
    lld_count: int
