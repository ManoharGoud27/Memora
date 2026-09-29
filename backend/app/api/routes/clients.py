"""Client CRUD endpoints."""
from datetime import UTC, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.client import Client
from app.models.conversation import Conversation
from app.models.memory import Memory
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services.memory_extractor import extract_memories
from app.services.semantic_search import embed_text

router = APIRouter(prefix="/clients", tags=["clients"])


def envelope(data: object, message: str) -> dict[str, object]:
    return {"success": True, "data": data, "message": message, "timestamp": datetime.now(UTC).isoformat()}


@router.get("")
def list_clients(db: Session = Depends(get_db), offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), search: str | None = None) -> dict[str, object]:
    query = select(Client).order_by(Client.created_at.desc()).offset(offset).limit(limit)
    if search:
        query = query.where(Client.name.ilike(f"%{search}%") | Client.company_name.ilike(f"%{search}%"))
    return envelope([ClientRead.model_validate(row).model_dump(mode="json") for row in db.scalars(query)], "Clients retrieved")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)) -> dict[str, object]:
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return envelope(ClientRead.model_validate(client).model_dump(mode="json"), "Client created")


@router.get("/{client_id}")
def get_client(client_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail={"code": "CLIENT_NOT_FOUND", "message": f"Client with ID {client_id} not found", "details": {}})
    return envelope(ClientRead.model_validate(client).model_dump(mode="json"), "Client retrieved")


@router.put("/{client_id}")
def update_client(client_id: UUID, payload: ClientUpdate, db: Session = Depends(get_db)) -> dict[str, object]:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail={"code": "CLIENT_NOT_FOUND", "message": f"Client with ID {client_id} not found", "details": {}})
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return envelope(ClientRead.model_validate(client).model_dump(mode="json"), "Client updated")


@router.delete("/{client_id}")
def delete_client(client_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail={"code": "CLIENT_NOT_FOUND", "message": f"Client with ID {client_id} not found", "details": {}})
    db.delete(client)
    db.commit()
    return envelope({"id": str(client_id)}, "Client deleted")


@router.post("/{client_id}/analyze")
def analyze_client(client_id: UUID, db: Session = Depends(get_db)) -> dict[str, object]:
    """Scan all past conversations for this client and auto-extract memories using AI."""
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail={"code": "CLIENT_NOT_FOUND", "message": f"Client with ID {client_id} not found", "details": {}})

    conversations = list(db.scalars(
        select(Conversation)
        .where(Conversation.client_id == client_id, Conversation.role == "user")
        .order_by(Conversation.created_at.asc())
    ))

    if not conversations:
        return envelope({"memories_added": 0}, "No conversation history found for this client")

    added = 0
    for conv in conversations:
        try:
            extracted = extract_memories(conv.content)
        except Exception:
            continue
        for item in extracted:
            db.add(Memory(
                client_id=client_id,
                project_id=conv.project_id,
                type=item.type,
                content=item.content,
                confidence=item.confidence,
                source="auto-analysis",
                metadata_={"tags": item.tags},
                embedding=embed_text(item.content),
            ))
            added += 1

    db.commit()
    return envelope({"memories_added": added}, f"Analysis complete — {added} new memories extracted from {len(conversations)} messages")


from pydantic import BaseModel, Field


class IngestNotesRequest(BaseModel):
    raw_content: str = Field(min_length=5, description="Raw conversation text or client brief from WhatsApp, Email, Slack, etc.")
    source: str = Field(default="whatsapp", description="Platform source: whatsapp, email, slack, notes")
    auto_save_memories: bool = Field(default=True, description="Automatically persist extracted memories to database")


@router.post("/{client_id}/ingest-notes")
def ingest_client_notes(client_id: UUID, payload: IngestNotesRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    """Summarize external client chat/emails, extract & store memories, and provide Indian Rupee payment & scope suggestions."""
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail={"code": "CLIENT_NOT_FOUND", "message": f"Client with ID {client_id} not found", "details": {}})

    from app.services.requirements_advisor import analyze_client_requirements

    analysis = analyze_client_requirements(
        raw_content=payload.raw_content,
        source=payload.source,
        client_name=client.name,
    )

    memories_saved = 0
    if payload.auto_save_memories and analysis.memories:
        for item in analysis.memories:
            db.add(Memory(
                client_id=client_id,
                project_id=None,
                type=item.type,
                content=item.content,
                confidence=item.confidence,
                source=f"import-{payload.source.lower()}",
                metadata_={"tags": item.tags, "platform": payload.source},
                embedding=embed_text(item.content),
            ))
            memories_saved += 1
        db.commit()

    return envelope({
        "summary": analysis.summary,
        "client_objective": analysis.client_objective,
        "detected_budget_inr": analysis.detected_budget_inr,
        "detected_timeline": analysis.detected_timeline,
        "memories_saved_count": memories_saved,
        "memories": [m.model_dump() for m in analysis.memories],
        "scope_suggestions": [s.model_dump() for s in analysis.scope_suggestions],
        "payment_suggestions": [p.model_dump() for p in analysis.payment_suggestions],
        "questions_to_ask_client": analysis.questions_to_ask_client,
    }, f"Requirements analyzed from {payload.source.capitalize()} with {memories_saved} memories saved")

