"""Pydantic schemas for project payments."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    project_id: UUID
    amount: Decimal = Field(gt=0)
    type: str
    status: str = "pending"
    due_date: date | None = None
    paid_date: date | None = None
    description: str | None = None


class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    type: str | None = None
    status: str | None = None
    due_date: date | None = None
    paid_date: date | None = None
    description: str | None = None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    project_id: UUID | None
    amount: Decimal
    type: str
    status: str
    due_date: date | None
    paid_date: date | None
    description: str | None
    created_at: datetime
