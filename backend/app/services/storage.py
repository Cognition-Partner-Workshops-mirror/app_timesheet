"""
Project storage service.
Persists project data as JSON files on disk for simplicity.
"""

import json
from pathlib import Path
from typing import Optional

from app.core.config import DATA_DIR
from app.models.schemas import Project, ProjectSummary


def _project_path(project_id: str) -> Path:
    """Return the file path for a given project's JSON data."""
    return DATA_DIR / f"{project_id}.json"


def save_project(project: Project) -> None:
    """Persist a project to disk as a JSON file."""
    path = _project_path(project.id)
    path.write_text(project.model_dump_json(indent=2), encoding="utf-8")


def load_project(project_id: str) -> Optional[Project]:
    """Load a project from disk by its ID. Returns None if not found."""
    path = _project_path(project_id)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return Project(**data)


def delete_project(project_id: str) -> bool:
    """Delete a project file from disk. Returns True if deleted."""
    path = _project_path(project_id)
    if path.exists():
        path.unlink()
        return True
    return False


def list_projects() -> list[ProjectSummary]:
    """List all projects as lightweight summaries."""
    summaries = []
    for path in DATA_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            project = Project(**data)
            summaries.append(
                ProjectSummary(
                    id=project.id,
                    name=project.name,
                    description=project.description,
                    created_at=project.created_at,
                    updated_at=project.updated_at,
                    image_count=len(project.images),
                    requirement_count=len(project.requirements),
                    has_hld=project.hld is not None,
                    service_count=len(project.hld.services) if project.hld else 0,
                    lld_count=len(project.llds),
                )
            )
        except Exception:
            # Skip corrupted project files
            continue
    # Sort by most recently updated
    summaries.sort(key=lambda s: s.updated_at, reverse=True)
    return summaries
