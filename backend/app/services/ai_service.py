"""
AI service for analyzing images and generating HLD/LLD documents.
Uses OpenAI GPT-4o for both vision (image analysis) and text generation.
"""

import base64
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from openai import OpenAI

from app.core.config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_VISION_MODEL
from app.models.schemas import (
    DesignPattern,
    DesignPatternCategory,
    HLD,
    LLD,
    Project,
    ServiceDefinition,
    ServiceEndpoint,
    ServiceType,
    UploadedImage,
)

logger = logging.getLogger(__name__)


def _get_client() -> OpenAI:
    """Create and return an OpenAI client instance."""
    return OpenAI(api_key=OPENAI_API_KEY)


def _encode_image(image_path: str) -> str:
    """Read an image file and return its base64-encoded content."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def analyze_image(image_path: str, endpoint_hint: str = "") -> dict:
    """
    Analyze a UI design image using GPT-4o vision.
    Returns detected endpoints, components, and a textual analysis.
    """
    client = _get_client()
    base64_image = _encode_image(image_path)

    # Determine image MIME type from extension
    ext = Path(image_path).suffix.lower()
    mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp"}
    mime_type = mime_map.get(ext, "image/png")

    context = f"This image is for the endpoint: {endpoint_hint}" if endpoint_hint else ""

    response = client.chat.completions.create(
        model=OPENAI_VISION_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert software architect analyzing UI design mockups. "
                    "Identify all UI components, data flows, API endpoints, user interactions, "
                    "and backend requirements implied by the design. Be thorough and specific."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Analyze this UI design image for a microservices architecture. {context}\n\n"
                            "Provide:\n"
                            "1. **Detected UI Components**: List all visible UI elements\n"
                            "2. **Implied API Endpoints**: What backend endpoints this UI needs\n"
                            "3. **Data Models**: What data structures are shown or implied\n"
                            "4. **User Flows**: What actions can users take\n"
                            "5. **Backend Services Needed**: What microservices would support this UI\n"
                            "6. **Security Considerations**: Auth, permissions, data protection needs\n\n"
                            "Return your analysis as a JSON object with keys: "
                            "analysis, detected_endpoints, detected_components, data_models, "
                            "user_flows, backend_services, security_notes"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}",
                            "detail": "high",
                        },
                    },
                ],
            },
        ],
        max_tokens=4096,
        temperature=0.3,
    )

    raw_text = response.choices[0].message.content or ""

    # Try to parse as JSON, fall back to raw text
    try:
        # Strip markdown code fences if present
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
        result = json.loads(cleaned)
    except (json.JSONDecodeError, IndexError):
        result = {
            "analysis": raw_text,
            "detected_endpoints": [],
            "detected_components": [],
        }

    return result


def generate_hld(project: Project, additional_context: str = "") -> HLD:
    """
    Generate a High-Level Design document based on project images,
    requirements, and context. Uses GPT-4o for comprehensive analysis.
    """
    client = _get_client()

    # Build context from uploaded images and their analyses
    image_context = ""
    for img in project.images:
        image_context += f"\n### UI Screen: {img.original_name}"
        if img.endpoint:
            image_context += f" (Endpoint: {img.endpoint})"
        if img.ai_analysis:
            image_context += f"\nAI Analysis:\n{img.ai_analysis}\n"
        if img.description:
            image_context += f"\nDescription: {img.description}\n"

    # Build context from requirements documents
    req_context = ""
    for req in project.requirements:
        if req.content:
            req_context += f"\n### Requirement: {req.original_name or 'User Input'}\n{req.content}\n"

    # Build existing HLD context if refining
    existing_hld = ""
    if project.hld and project.hld.raw_content:
        existing_hld = f"\n### Existing HLD (refine this):\n{project.hld.raw_content}\n"

    prompt = f"""You are a senior software architect designing a microservices-based system.

## Project: {project.name}
{project.description}

## Target Configuration
- Scale: {project.target_scale}
- Primary Language/Framework: {project.primary_language}
- Cloud Provider: {project.cloud_provider}

## UI Designs Analyzed
{image_context if image_context else "No UI designs uploaded yet."}

## Requirements
{req_context if req_context else "No formal requirements provided yet."}

{existing_hld}

{f"Additional Context: {additional_context}" if additional_context else ""}

## Instructions
Generate a comprehensive High-Level Design (HLD) document following microservices best practices.

**IMPORTANT: Return your response as a valid JSON object** with exactly these keys:

{{
    "title": "System title",
    "overview": "Executive summary of the system (2-3 paragraphs)",
    "architecture_overview": "Detailed architecture description with component interactions",
    "services": [
        {{
            "name": "Service Name",
            "service_type": "backend_service|api_gateway|auth_service|database_service|messaging_service|cache_service|monitoring_service|custom",
            "description": "What this service does",
            "responsibilities": ["resp1", "resp2"],
            "technology_stack": ["tech1", "tech2"],
            "endpoints": [
                {{"method": "GET|POST|PUT|DELETE", "path": "/api/...", "description": "What it does", "auth_required": true}}
            ],
            "dependencies": ["Other Service Name"],
            "database": "Database type and purpose",
            "protocols": ["REST", "gRPC", "WebSocket", etc.]
        }}
    ],
    "design_patterns": [
        {{
            "name": "Pattern Name",
            "category": "structural|communication|data_management|reliability|security|observability|deployment",
            "description": "What the pattern does",
            "rationale": "Why we chose it",
            "applied": true
        }}
    ],
    "scalability_strategy": "Detailed scalability approach",
    "security_strategy": "Comprehensive security architecture",
    "reliability_strategy": "High availability and fault tolerance plan",
    "communication_patterns": "Inter-service communication design",
    "deployment_strategy": "CI/CD and deployment architecture",
    "raw_content": "Full HLD document in detailed Markdown format with all sections"
}}

Ensure the design is:
- **Scalable**: Horizontal scaling, load balancing, caching strategies
- **Reliable**: Circuit breakers, retries, health checks, graceful degradation
- **Secure**: Authentication, authorization, encryption, API security
- **Optimized**: Performance tuning, efficient data access, CDN usage
- **Observable**: Logging, monitoring, tracing, alerting

Include at least these microservice patterns where applicable:
- API Gateway Pattern
- Service Discovery
- Circuit Breaker
- CQRS / Event Sourcing
- Saga Pattern for distributed transactions
- Database per Service
- Strangler Fig (if migration)
- Sidecar / Ambassador
- BFF (Backend for Frontend)
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a world-class software architect. Return ONLY valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=16000,
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content or "{}"
    data = json.loads(raw_text)

    # Parse services into ServiceDefinition objects
    services = []
    for svc_data in data.get("services", []):
        endpoints = []
        for ep in svc_data.get("endpoints", []):
            endpoints.append(ServiceEndpoint(
                method=ep.get("method", "GET"),
                path=ep.get("path", ""),
                description=ep.get("description", ""),
                request_schema=ep.get("request_schema", ""),
                response_schema=ep.get("response_schema", ""),
                auth_required=ep.get("auth_required", True),
            ))

        # Map service_type string to enum
        stype_str = svc_data.get("service_type", "backend_service")
        try:
            stype = ServiceType(stype_str)
        except ValueError:
            stype = ServiceType.BACKEND_SERVICE

        services.append(ServiceDefinition(
            name=svc_data.get("name", "Unknown Service"),
            service_type=stype,
            description=svc_data.get("description", ""),
            responsibilities=svc_data.get("responsibilities", []),
            technology_stack=svc_data.get("technology_stack", []),
            endpoints=endpoints,
            dependencies=svc_data.get("dependencies", []),
            database=svc_data.get("database", ""),
            protocols=svc_data.get("protocols", []),
        ))

    # Parse design patterns
    patterns = []
    for pat_data in data.get("design_patterns", []):
        cat_str = pat_data.get("category", "structural")
        try:
            category = DesignPatternCategory(cat_str)
        except ValueError:
            category = DesignPatternCategory.STRUCTURAL

        patterns.append(DesignPattern(
            name=pat_data.get("name", ""),
            category=category,
            description=pat_data.get("description", ""),
            rationale=pat_data.get("rationale", ""),
            applied=pat_data.get("applied", True),
        ))

    now = datetime.now().isoformat()
    hld = HLD(
        title=data.get("title", f"{project.name} - High Level Design"),
        overview=data.get("overview", ""),
        architecture_overview=data.get("architecture_overview", ""),
        services=services,
        design_patterns=patterns,
        scalability_strategy=data.get("scalability_strategy", ""),
        security_strategy=data.get("security_strategy", ""),
        reliability_strategy=data.get("reliability_strategy", ""),
        communication_patterns=data.get("communication_patterns", ""),
        deployment_strategy=data.get("deployment_strategy", ""),
        raw_content=data.get("raw_content", ""),
        generated_at=now,
        last_modified=now,
    )

    return hld


def generate_lld(
    project: Project,
    service: ServiceDefinition,
    additional_context: str = "",
    existing_lld: Optional[LLD] = None,
) -> LLD:
    """
    Generate a Low-Level Design document for a specific service.
    Takes into account the HLD context and related UI images.
    """
    client = _get_client()

    # Build HLD context
    hld_context = ""
    if project.hld:
        hld_context = f"""
## HLD Context
Title: {project.hld.title}
Overview: {project.hld.overview}
Architecture: {project.hld.architecture_overview}
"""
        # Include other services for dependency context
        other_services = [s for s in project.hld.services if s.id != service.id]
        if other_services:
            hld_context += "\n### Other Services in the System:\n"
            for s in other_services:
                hld_context += f"- **{s.name}** ({s.service_type.value}): {s.description}\n"

    # Build image context for related images
    image_context = ""
    for img_id in service.related_image_ids:
        img = next((i for i in project.images if i.id == img_id), None)
        if img and img.ai_analysis:
            image_context += f"\n### Related UI: {img.original_name}\n{img.ai_analysis}\n"

    # Include existing LLD if refining
    existing_content = ""
    if existing_lld and existing_lld.raw_content:
        existing_content = f"\n### Existing LLD (refine this):\n{existing_lld.raw_content}\n"

    prompt = f"""You are a senior software engineer creating a detailed Low-Level Design.

## Project: {project.name}
Primary Language: {project.primary_language}
Cloud: {project.cloud_provider}
Target Scale: {project.target_scale}

{hld_context}

## Service to Design: {service.name}
Type: {service.service_type.value}
Description: {service.description}
Responsibilities: {', '.join(service.responsibilities)}
Technology Stack: {', '.join(service.technology_stack)}
Database: {service.database}
Protocols: {', '.join(service.protocols)}
Dependencies: {', '.join(service.dependencies)}

### Endpoints:
{chr(10).join(f"- {ep.method} {ep.path}: {ep.description}" for ep in service.endpoints)}

{image_context}
{existing_content}
{f"Additional Context: {additional_context}" if additional_context else ""}

## Instructions
Generate a comprehensive Low-Level Design (LLD) for this service.

**IMPORTANT: Return your response as a valid JSON object** with these keys:

{{
    "component_diagram": "Detailed component/module breakdown in Markdown with descriptions",
    "class_design": "Class/module design with properties, methods, relationships in Markdown",
    "database_schema": "Complete database schema with tables, columns, types, indexes, constraints in Markdown",
    "api_contracts": "Detailed API contracts with request/response schemas, status codes, headers in Markdown",
    "sequence_flows": "Key sequence diagrams described in Mermaid or textual format",
    "error_handling": "Error handling strategy with error codes, retry logic, fallback mechanisms in Markdown",
    "data_validation": "Input validation rules, sanitization, business rule enforcement in Markdown",
    "caching_strategy": "Cache layers, TTLs, invalidation strategies, cache-aside patterns in Markdown",
    "logging_monitoring": "Structured logging, metrics, health checks, alerting rules in Markdown",
    "security_details": "Authentication flow, authorization rules, encryption, secrets management in Markdown",
    "raw_content": "Complete LLD document in detailed Markdown format with all sections combined"
}}

Make the LLD:
- Implementation-ready with specific class names, method signatures, and data types
- Include proper error codes and HTTP status mappings
- Define database indexes for query optimization
- Specify caching TTLs and invalidation triggers
- Include circuit breaker thresholds and retry policies
- Define structured log formats and metric names
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a world-class software engineer. Return ONLY valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=16000,
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content or "{}"
    data = json.loads(raw_text)

    now = datetime.now().isoformat()
    lld = LLD(
        service_id=service.id,
        service_name=service.name,
        component_diagram=data.get("component_diagram", ""),
        class_design=data.get("class_design", ""),
        database_schema=data.get("database_schema", ""),
        api_contracts=data.get("api_contracts", ""),
        sequence_flows=data.get("sequence_flows", ""),
        error_handling=data.get("error_handling", ""),
        data_validation=data.get("data_validation", ""),
        caching_strategy=data.get("caching_strategy", ""),
        logging_monitoring=data.get("logging_monitoring", ""),
        security_details=data.get("security_details", ""),
        raw_content=data.get("raw_content", ""),
        generated_at=now,
        last_modified=now,
    )

    return lld
