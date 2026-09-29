"""Pydantic schemas for client operations."""
from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    industry: str | None = None
    company_name: str | None = None
    contact_info: dict[str, Any] = Field(default_factory=dict)
    communication_preference: str = "email"
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["active", "inactive", "archived"] = "active"


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    industry: str | None = None
    company_name: str | None = None
    contact_info: dict[str, Any] | None = None
    communication_preference: str | None = None
    priority: Literal["low", "medium", "high"] | None = None
    status: Literal["active", "inactive", "archived"] | None = None


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    industry: str | None
    company_name: str | None
    contact_info: dict[str, Any]
    communication_preference: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
