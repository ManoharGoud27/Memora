"""Vector embedding and similarity-search helpers."""
from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings

if TYPE_CHECKING:
    from app.models.memory import Memory



def embed_text(content: str) -> list[float] | None:
    """Embed text using the configured LLM provider (Gemini or OpenAI)."""
    model_name = settings.llm_model.lower()
    is_gemini = model_name.startswith("gemini")
    is_openai = model_name.startswith("gpt") or "openai" in model_name
    api_key = settings.embedding_api_key or settings.llm_api_key
    if not api_key:
        return None
    if is_gemini:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            embedder = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=api_key,
                task_type="retrieval_document",
            )
            return embedder.embed_query(content)  # returns 768-dim vector
        except Exception:
            return None
    if is_openai:
        try:
            from langchain_openai import OpenAIEmbeddings
            embed_key = api_key.strip()
            if embed_key and not embed_key.startswith("sk-"):
                embed_key = f"sk-proj-{embed_key}"
            embedder = OpenAIEmbeddings(model=settings.embedding_model, dimensions=768, api_key=embed_key)
            vector = embedder.embed_query(content)
            return vector if len(vector) == 768 else vector[:768]
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("OpenAI embedding failed: %s", exc)
            return None
    return None



def search_memories(db: Session, query: str, client_id: UUID | None = None, limit: int = 10, require_embedding: bool = False) -> list[Memory]:
    """Return memories ordered by cosine distance when embeddings are configured."""
    embedding = embed_text(query)
    if embedding is None and require_embedding:
        raise HTTPException(status_code=503, detail={"code": "EMBEDDINGS_NOT_CONFIGURED", "message": "Set EMBEDDING_API_KEY to enable semantic search", "details": {}})
    from app.models.memory import Memory
    statement = select(Memory)
    if client_id is not None:
        statement = statement.where(Memory.client_id == client_id)
    if embedding is None:
        return list(db.scalars(statement.order_by(Memory.created_at.desc()).limit(limit)))
    statement = statement.where(Memory.embedding.is_not(None)).order_by(Memory.embedding.cosine_distance(embedding)).limit(limit)
    return list(db.scalars(statement))
