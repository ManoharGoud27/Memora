"""Client ORM model."""
from datetime import datetime
from typing import Any
from uuid import UUID
from sqlalchemy import DateTime, Index, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (Index("idx_clients_status", "status"),)
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    industry: Mapped[str | None] = mapped_column(Text)
    company_name: Mapped[str | None] = mapped_column(Text)
    contact_info: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    communication_preference: Mapped[str] = mapped_column(Text, nullable=False, server_default="email")
    priority: Mapped[str] = mapped_column(Text, nullable=False, server_default="medium")
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    projects: Mapped[list["Project"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    memories: Mapped[list["Memory"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="client", cascade="all, delete-orphan")
