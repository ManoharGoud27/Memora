"""Pydantic schemas for projects."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    client_id: UUID | None = None
    name: str = Field(min_length=1)
    description: str | None = None
    budget: Decimal | None = None
    deadline: date | None = None
    status: str = "active"
    progress: int = Field(default=0, ge=0, le=100)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    budget: Decimal | None = None
    deadline: date | None = None
    status: str | None = None
    progress: int | None = Field(default=None, ge=0, le=100)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    client_id: UUID | None
    name: str
    description: str | None
    budget: Decimal | None
    deadline: date | None
    status: str
    progress: int
    created_at: datetime
    updated_at: datetime
