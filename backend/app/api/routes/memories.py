"""Memory CRUD and semantic search endpoints."""
from datetime import UTC, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.memory import Memory
from app.schemas.memory import MemoryCreate, MemoryRead, MemorySearch, MemoryUpdate
from app.services.semantic_search import embed_text, search_memories

router = APIRouter(prefix="/memories", tags=["memories"])


def envelope(data: object, message: str) -> dict[str, object]:
    return {"success": True, "data": data, "message": message, "timestamp": datetime.now(UTC).isoformat()}


def lookup(db: Session, memory_id: UUID) -> Memory:
    memory = db.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(404, detail={"code": "MEMORY_NOT_FOUND", "message": f"Memory {memory_id} was not found", "details": {}})
    return memory


@router.get("")
def list_memories(db: Session = Depends(get_db), client_id: UUID | None = None, project_id: UUID | None = None, type: str | None = None, limit: int = Query(100, ge=1, le=500)) -> dict[str, object]:
    query = select(Memory).order_by(Memory.created_at.desc()).limit(limit)
    if client_id is not None: query = query.where(Memory.client_id == client_id)
    if project_id is not None: query = query.where(Memory.project_id == project_id)
    if type is not None: query = query.where(Memory.type == type)
    return envelope([MemoryRead.model_validate(row).model_dump(mode="json") for row in db.scalars(query)], "Memories retrieved")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_memory(payload: MemoryCreate, db: Session = Depends(get_db)) -> dict[str, object]:
    values = payload.model_dump(exclude={"metadata"})
    values["metadata_"] = payload.metadata
    values["embedding"] = embed_text(payload.content)
    memory = Memory(**values)
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return envelope(MemoryRead.model_validate(memory).model_dump(mode="json"), "Memory created")


@router.post("/search")
def search(payload: MemorySearch, db: Session = Depends(get_db)) -> dict[str, object]:
    rows = search_memories(db, payload.query, payload.client_id, payload.limit, require_embedding=True)
    return envelope([MemoryRead.model_validate(row).model_dump(mode="json") for row in rows], "Relevant memories retrieved")


@router.get("/{memory_id}")
def get_memory(memory_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    return envelope(MemoryRead.model_validate(lookup(db, memory_id)).model_dump(mode="json"), "Memory retrieved")


@router.put("/{memory_id}")
def update_memory(memory_id: UUID, payload: MemoryUpdate, db: Session = Depends(get_db)) -> dict[str, object]:
    memory = lookup(db, memory_id)
    changes = payload.model_dump(exclude_unset=True, exclude={"metadata"})
    if "metadata" in payload.model_fields_set: changes["metadata_"] = payload.metadata
    for key, value in changes.items(): setattr(memory, key, value)
    if "content" in changes: memory.embedding = embed_text(memory.content)
    db.commit()
    db.refresh(memory)
    return envelope(MemoryRead.model_validate(memory).model_dump(mode="json"), "Memory updated")


@router.delete("/{memory_id}")
def delete_memory(memory_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    db.delete(lookup(db, memory_id))
    db.commit()
    return envelope({"id": str(memory_id)}, "Memory deleted")
