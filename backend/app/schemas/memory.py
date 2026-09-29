"""Pydantic schemas for memories."""
from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

MemoryType = Literal["preference", "feedback", "decision", "requirement", "task", "deadline", "fact", "outcome"]


class MemoryCreate(BaseModel):
    client_id: UUID | None = None
    project_id: UUID | None = None
    type: MemoryType
    content: str = Field(min_length=1)
    confidence: float = Field(default=0.9, ge=0, le=1)
    source: str | None = "manual"
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_verified: bool = True


class MemoryUpdate(BaseModel):
    type: MemoryType | None = None
    content: str | None = Field(default=None, min_length=1)
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: str | None = None
    metadata: dict[str, Any] | None = None
    is_verified: bool | None = None


class MemoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: UUID
    client_id: UUID | None
    project_id: UUID | None
    type: str
    content: str
    confidence: float
    source: str | None
    metadata: dict[str, Any] = Field(validation_alias="metadata_")
    is_verified: bool
    created_at: datetime
    last_used_at: datetime


class MemorySearch(BaseModel):
    query: str = Field(min_length=1)
    client_id: UUID | None = None
    limit: int = Field(default=10, ge=1, le=100)
