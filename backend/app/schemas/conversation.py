"""Pydantic schemas for conversations and AI chat."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    client_id: UUID
    project_id: UUID | None = None
    role: str = "user"
    content: str = Field(min_length=1)


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    client_id: UUID | None
    project_id: UUID | None
    role: str
    content: str
    created_at: datetime


class ChatRequest(BaseModel):
    client_id: UUID
    project_id: UUID | None = None
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str
    memory_ids: list[UUID]
    explanation: str
