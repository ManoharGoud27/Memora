from datetime import UTC, datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.conversation import Conversation
from app.models.memory import Memory
from app.schemas.conversation import ChatRequest, ConversationCreate, ConversationRead
from app.services.ai_assistant import answer_client_question
from app.services.memory_extractor import extract_memories
from app.services.semantic_search import embed_text

router = APIRouter(prefix="/conversations", tags=["conversations"])


def envelope(data: object, message: str) -> dict[str, object]:
    return {"success": True, "data": data, "message": message, "timestamp": datetime.now(UTC).isoformat()}


@router.get("")
def list_conversations(db: Session = Depends(get_db), client_id: UUID | None = None, limit: int = Query(100, ge=1, le=500)) -> dict[str, object]:
    query = select(Conversation).order_by(Conversation.created_at.asc(), Conversation.id.asc()).limit(limit)
    if client_id is not None:
        query = query.where(Conversation.client_id == client_id)
    rows = list(db.scalars(query))
    return envelope([ConversationRead.model_validate(row).model_dump(mode="json") for row in rows], "Conversations retrieved")


@router.post("", status_code=status.HTTP_201_CREATED)
def add_conversation(payload: ConversationCreate, db: Session = Depends(get_db)) -> dict[str, object]:
    conversation = Conversation(**payload.model_dump(), embedding=embed_text(payload.content))
    db.add(conversation)
    if payload.role == "user":
        for extracted in extract_memories(payload.content):
            db.add(Memory(client_id=payload.client_id, project_id=payload.project_id, type=extracted.type, content=extracted.content, confidence=extracted.confidence, source="conversation", metadata_={"tags": extracted.tags}, embedding=embed_text(extracted.content)))
    db.commit()
    db.refresh(conversation)
    return envelope(ConversationRead.model_validate(conversation).model_dump(mode="json"), "Conversation added")


@router.post("/chat")
def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    answer, memory_ids, explanation = answer_client_question(db, payload.client_id, payload.project_id, payload.message)
    try:
        # Save conversation history with user message strictly preceding assistant message
        now = datetime.now(UTC)
        user_ts = now
        asst_ts = now + timedelta(milliseconds=50)
        db.add(Conversation(client_id=payload.client_id, project_id=payload.project_id, role="user", content=payload.message, created_at=user_ts))
        db.add(Conversation(client_id=payload.client_id, project_id=payload.project_id, role="assistant", content=answer, created_at=asst_ts))

        # Only extract durable memories if user shared substantial facts/notes (not questions or short chatter)
        msg_words = payload.message.strip().split()
        first_word = msg_words[0].lower() if msg_words else ""
        is_query_or_greeting = "?" in payload.message or first_word in ["what", "who", "why", "when", "how", "can", "could", "is", "are", "do", "does", "tell", "hi", "hello", "hey", "sup", "thanks"]
        if len(msg_words) >= 8 and not is_query_or_greeting:
            extracted_memories = extract_memories(payload.message)
            for extracted in extracted_memories:
                db.add(Memory(client_id=payload.client_id, project_id=payload.project_id, type=extracted.type, content=extracted.content, confidence=extracted.confidence, source="conversation", metadata_={"tags": extracted.tags}))

        db.commit()
    except Exception as exc:
        db.rollback()
        import logging
        logging.getLogger(__name__).warning("Failed to store conversation/memories: %s", exc)
    return envelope({"answer": answer, "memory_ids": [str(memory_id) for memory_id in memory_ids], "explanation": explanation}, "Assistant response created")
