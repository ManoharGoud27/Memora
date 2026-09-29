"""Extract structured client memories from messages using a chat model."""
from typing import Literal
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.llm import get_chat_model


class ExtractedMemory(BaseModel):
    type: Literal["preference", "feedback", "decision", "requirement", "task", "deadline", "fact", "outcome"]
    content: str = Field(description="A concise, standalone fact that will remain useful later")
    confidence: float = Field(ge=0, le=1)
    tags: list[str] = Field(default_factory=list)


class ExtractionResult(BaseModel):
    memories: list[ExtractedMemory] = Field(default_factory=list)


import logging

logger = logging.getLogger(__name__)


def extract_memories(content: str) -> list[ExtractedMemory]:
    """Return extracted memories, or an empty list when AI is not configured or fails."""
    if not settings.llm_api_key or not content.strip():
        return []
    try:
        model = get_chat_model().with_structured_output(ExtractionResult)
        result = model.invoke([
            ("system", "Extract durable facts, preferences, decisions, requirements, tasks, deadlines, and outcomes explicitly supported by the message. Do not invent. Return no memories for greetings or chatter."),
            ("human", content),
        ])
        if isinstance(result, ExtractionResult):
            return result.memories
        return []
    except Exception as exc:
        logger.warning("Memory extraction skipped or failed: %s", exc)
        return []
