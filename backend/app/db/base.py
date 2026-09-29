"""SQLAlchemy declarative base and model registry."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for ORM models."""

