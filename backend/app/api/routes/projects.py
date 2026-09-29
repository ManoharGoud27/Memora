"""Project CRUD endpoints."""
from datetime import UTC, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def envelope(data: object, message: str) -> dict[str, object]:
    return {"success": True, "data": data, "message": message, "timestamp": datetime.now(UTC).isoformat()}


def lookup(db: Session, project_id: UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, detail={"code": "PROJECT_NOT_FOUND", "message": f"Project {project_id} was not found", "details": {}})
    return project


@router.get("")
def list_projects(db: Session = Depends(get_db), client_id: UUID | None = None, limit: int = Query(100, ge=1, le=500)) -> dict[str, object]:
    query = select(Project).order_by(Project.created_at.desc()).limit(limit)
    if client_id is not None:
        query = query.where(Project.client_id == client_id)
    return envelope([ProjectRead.model_validate(row).model_dump(mode="json") for row in db.scalars(query)], "Projects retrieved")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> dict[str, object]:
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return envelope(ProjectRead.model_validate(project).model_dump(mode="json"), "Project created")


@router.get("/{project_id}")
def get_project(project_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    return envelope(ProjectRead.model_validate(lookup(db, project_id)).model_dump(mode="json"), "Project retrieved")


@router.put("/{project_id}")
def update_project(project_id: UUID, payload: ProjectUpdate, db: Session = Depends(get_db)) -> dict[str, object]:
    project = lookup(db, project_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return envelope(ProjectRead.model_validate(project).model_dump(mode="json"), "Project updated")


@router.delete("/{project_id}")
def delete_project(project_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    db.delete(lookup(db, project_id))
    db.commit()
    return envelope({"id": str(project_id)}, "Project deleted")
