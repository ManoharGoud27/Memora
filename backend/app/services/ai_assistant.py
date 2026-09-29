"""Versatile AI assistant for freelancers — general intelligent conversationalist with on-demand client context."""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


def _fetch_client_context(db: Session, client_id: UUID, project_id: UUID | None) -> dict[str, object]:
    """Retrieve client records from the database to supply on-demand context."""
    from app.models.client import Client
    from app.models.project import Project
    from app.models.memory import Memory
    from app.models.conversation import Conversation
    from app.models.payment import Payment

    client = db.get(Client, client_id)
    projects_query = select(Project).where(Project.client_id == client_id).order_by(Project.created_at.desc()).limit(10)
    projects = list(db.scalars(projects_query))

    memories_query = select(Memory).where(Memory.client_id == client_id).order_by(Memory.created_at.desc()).limit(25)
    memories = list(db.scalars(memories_query))

    payments: list[Payment] = []
    if projects:
        project_ids = [p.id for p in projects]
        payments_query = select(Payment).where(Payment.project_id.in_(project_ids)).order_by(Payment.created_at.desc()).limit(15)
        payments = list(db.scalars(payments_query))

    convos_query = select(Conversation).where(Conversation.client_id == client_id).order_by(Conversation.created_at.desc()).limit(8)
    convos = list(db.scalars(convos_query))

    # Build reference dossier for the LLM
    sections: list[str] = []
    if client:
        sections.append(
            f"### Client: {client.name}\n"
            f"- Company: {client.company_name or 'N/A'}\n"
            f"- Industry: {client.industry or 'N/A'}\n"
            f"- Status: {client.status} | Priority: {client.priority}\n"
            f"- Communication Preference: {client.communication_preference}\n"
            f"- Contact Info: {client.contact_info or '{}'}"
        )

    if projects:
        project_lines = []
        for p in projects:
            budget_str = f"₹{p.budget:,.0f}" if p.budget else "No budget set"
            deadline_str = p.deadline.strftime('%d %b %Y') if p.deadline else "No deadline"
            project_lines.append(f"- {p.name}: Status={p.status}, Progress={p.progress}%, Budget={budget_str}, Deadline={deadline_str}")
        sections.append(f"### Projects ({len(projects)}):\n" + "\n".join(project_lines))

    if payments:
        pay_lines = []
        for pay in payments:
            amount_str = f"₹{pay.amount:,.0f}" if pay.amount else "N/A"
            due_str = pay.due_date.strftime('%d %b %Y') if pay.due_date else "No due date"
            pay_lines.append(f"- {amount_str} ({pay.type}) - Status: {pay.status}, Due: {due_str}")
        sections.append(f"### Payments ({len(payments)}):\n" + "\n".join(pay_lines))

    if memories:
        mem_lines = []
        for m in memories:
            mem_lines.append(f"- [{m.type}] {m.content}")
        sections.append(f"### Stored Notes & Preferences ({len(memories)}):\n" + "\n".join(mem_lines))

    return {
        "client": client,
        "projects": projects,
        "memories": memories,
        "payments": payments,
        "convos": convos,
        "context_str": "\n\n".join(sections) if sections else "No dossier available.",
    }


import re


def _try_solve_math(text: str) -> str | None:
    """Evaluate basic arithmetic and percentages accurately."""
    raw = text.strip()
    cleaned = re.sub(r"^(what\s+is|what\'s|calculate|calc|solve|compute)\s+", "", raw, flags=re.IGNORECASE).strip()
    cleaned = cleaned.rstrip("?=").strip()

    # Percentage: e.g. "18% of 50000" or "20% of 1000"
    pct_m = re.match(r"^(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(\d+(?:\.\d+)?)$", cleaned, re.IGNORECASE)
    if pct_m:
        p, val = float(pct_m.group(1)), float(pct_m.group(2))
        res = (p / 100.0) * val
        res_str = f"{res:,.2f}".rstrip("0").rstrip(".")
        val_str = f"{val:,.2f}".rstrip("0").rstrip(".")
        return f"**{p}% of {val_str}** = **{res_str}**"

    # Arithmetic expression check: digits, operators, parentheses
    if re.match(r"^[\d\s\+\-\*\/\%\(\)\.]+$", cleaned) and any(c in cleaned for c in "+-*/%"):
        try:
            val = eval(cleaned, {"__builtins__": {}}, {})
            if isinstance(val, (int, float)):
                if isinstance(val, float) and val.is_integer():
                    val = int(val)
                val_formatted = f"{val:,}" if isinstance(val, int) else f"{val:,.4f}".rstrip("0").rstrip(".")
                return f"{cleaned} = **{val_formatted}**"
        except Exception:
            pass
    return None


def _spontaneous_answer(client_data: dict[str, object], message: str) -> str:
    """Intelligent standalone assistant response when external LLM is offline or times out."""
    # 0. Check for math / calculations first (e.g. 3+3, 1500 * 4)
    math_result = _try_solve_math(message)
    if math_result:
        return math_result

    client = client_data.get("client")
    projects = client_data.get("projects") or []
    memories = client_data.get("memories") or []
    payments = client_data.get("payments") or []

    client_name = getattr(client, "name", "the selected client") if client else "the selected client"
    msg_lower = message.lower().strip()
    words = msg_lower.split()
    first_w = words[0] if words else ""

    # 1. Greetings — respond naturally, DO NOT dump client data unprompted
    if first_w in ["hi", "hello", "hey", "howdy", "sup", "yo", "greetings"] or msg_lower in ["good morning", "good evening", "good afternoon"]:
        return (
            f"Hello! How can I help you today?\n\n"
            f"I'm your assistant in Memora. You can ask me any general questions, draft emails/reminders, "
            f"or ask for specific details about **{client_name}** (projects, milestones, payments in ₹, or saved notes) whenever you need them."
        )

    # 2. Projects & Deadlines
    if any(k in msg_lower for k in ["project", "work", "deadline", "milestone", "progress"]):
        if not projects:
            return f"There are currently no projects recorded for **{client_name}**."
        lines = [f"Here are the active projects for **{client_name}**:\n"]
        for p in projects:
            budget_str = f"₹{p.budget:,.0f}" if getattr(p, "budget", None) else "No budget"
            deadline_str = p.deadline.strftime("%d %b %Y") if getattr(p, "deadline", None) else "No deadline set"
            lines.append(f"• **{p.name}**\n  - Status: `{p.status.upper()}` | Progress: **{p.progress}%**\n  - Budget: **{budget_str}** | Deadline: {deadline_str}")
        return "\n".join(lines)

    # 3. Payments & Budget
    if any(k in msg_lower for k in ["pay", "money", "budget", "cost", "inr", "rupee", "₹", "invoice", "due", "pending"]):
        if not payments:
            return f"No payment records are currently logged for **{client_name}**."
        lines = [f"Payment summary for **{client_name}**:\n"]
        total = sum(p.amount for p in payments if getattr(p, "amount", None))
        for p in payments:
            amount_str = f"₹{p.amount:,.0f}" if getattr(p, "amount", None) else "N/A"
            due_str = p.due_date.strftime("%d %b %Y") if getattr(p, "due_date", None) else "No date"
            lines.append(f"• **{amount_str}** — {p.type.title()} (`{p.status}`) | Due: {due_str}")
        lines.append(f"\n**Total Tracked:** ₹{total:,.0f}")
        return "\n".join(lines)

    # 4. Memories & Preferences & Requirements
    if any(k in msg_lower for k in ["preference", "memory", "memories", "remember", "keep in mind", "note", "requirement"]):
        if not memories:
            return f"No specific memories or requirements have been saved for **{client_name}** yet."
        lines = [f"Here are the key notes and preferences saved for **{client_name}**:\n"]
        for m in memories:
            lines.append(f"• [{m.type.upper()}] {m.content}")
        return "\n".join(lines)

    # 5. Client Dossier / Who is
    if any(k in msg_lower for k in ["who is", "about client", "client details", "client info", "tell me about"]):
        company = getattr(client, "company_name", None) or "Freelance Client"
        industry = getattr(client, "industry", None) or "Not specified"
        pref = getattr(client, "communication_preference", "WhatsApp")
        return (
            f"### Client Overview: {client_name}\n"
            f"- **Company / Industry:** {company} ({industry})\n"
            f"- **Status / Priority:** {getattr(client, 'status', 'active').title()} (Priority: {getattr(client, 'priority', 'standard').title()})\n"
            f"- **Preferred Channel:** {pref.title()}\n"
            f"- **Projects:** {len(projects)} active\n"
            f"- **Stored Notes:** {len(memories)} notes/preferences tracked"
        )

    # 6. Drafting reminders / messages
    if any(k in msg_lower for k in ["draft", "message", "reminder", "email", "whatsapp"]):
        pref = getattr(client, "communication_preference", "WhatsApp")
        return (
            f"Here is a draft message you can send to **{client_name}** via {pref.title()}:\n\n"
            f"> *\"Hi {client_name}, I hope you're doing well! Just wanted to share a quick update on our current milestone. "
            f"Everything is tracking smoothly. Let me know if you have any questions or feedback!\"*"
        )

    # 7. Help & Capabilities
    if any(k in msg_lower for k in ["help", "what can you do", "features", "capabilities"]):
        return (
            "I'm **Memo**, your assistant in Memora. Here's what I can do:\n\n"
            "• **Answer any question:** Calculations (e.g. `3+3` or `18% of 50000`), general knowledge, freelance advice, and writing.\n"
            f"• **Client intelligence on demand:** Ask about **{client_name}**'s projects, milestones, payments in ₹, or saved preferences.\n"
            "• **Drafting:** Create polished WhatsApp and email reminders or updates.\n\n"
            "Feel free to ask whatever you need!"
        )

    # 8. General Assistant Response
    return (
        f"I received your question: *\"{message}\"*. "
        f"As your AI assistant in Memora, I can help you solve calculations (e.g. `3+3`), draft client messages, or look up details regarding **{client_name}** (projects, deadlines, payments in ₹). "
        f"How can I assist you with this?"
    )


SYSTEM_PROMPT = """You are 'Memo', an intelligent, versatile AI assistant built into Memora for freelancers.

CORE BEHAVIORS:
1. Versatile Assistant:
   - Answer ANY question the user asks: general knowledge, freelance advice, drafting messages/proposals, calculations, brainstorming, coding, or scheduling.
   - For greetings (e.g. "hi", "hello", "hey"): Respond warmly, naturally, and concisely as an AI assistant (e.g. "Hello! How can I help you today?").
   - DO NOT unprompted dump the client dossier upon simple greetings.

2. On-Demand Client Intelligence:
   - You have access to the ACTIVE CLIENT DOSSIER below for {client_name}.
   - ONLY when the user asks about the client, their projects, requirements, payments, or saved notes, retrieve and weave the specific requested data into your answer.
   - Answer precisely what was asked (e.g. if asked about projects, detail the projects; if asked about budget or payments, quote the INR ₹ figures).
   - Use Indian Rupees (₹) for monetary amounts.
   - If the user asks about something not in the dossier, state what you know and suggest next steps.

--- ACTIVE CLIENT DOSSIER ({client_name}) ---
{context}
--- END ACTIVE CLIENT DOSSIER ---
"""


def answer_client_question(
    db: Session,
    client_id: UUID,
    project_id: UUID | None,
    message: str,
) -> tuple[str, list[UUID], str]:
    """Provide a responsive, grounded AI answer with on-demand client context."""
    # 1. Fetch client data for on-demand availability
    try:
        data = _fetch_client_context(db, client_id, project_id)
        context_str = str(data.get("context_str", ""))
        convos = data.get("convos", [])
        client_obj = data.get("client")
    except Exception as exc:
        logger.warning("Failed to fetch client context: %s", exc)
        data = {}
        context_str = "No client dossier found."
        convos = []
        client_obj = None

    client_name = getattr(client_obj, "name", "the client") if client_obj else "the client"

    # 2. Fast intent check: skip vector search on short chatter/greetings to respond instantly
    msg_words = message.lower().strip().split()
    first_w = msg_words[0] if msg_words else ""
    is_greeting_or_short = len(msg_words) <= 3 and first_w in ["hi", "hello", "hey", "sup", "yo", "thanks", "ok", "okay", "bye"]

    memory_ids: list[UUID] = []
    if not is_greeting_or_short:
        try:
            from app.services.semantic_search import search_memories
            memories = search_memories(db, message, client_id, 4)
            memory_ids = [m.id for m in memories]
        except Exception as exc:
            logger.warning("Semantic search skipped: %s", exc)

    # 3. Invoke LLM with multi-turn conversation memory
    answer: str | None = None
    if settings.llm_api_key:
        try:
            from app.services.llm import get_chat_model
            model = get_chat_model(temperature=0.3)

            prompt = SYSTEM_PROMPT.format(client_name=client_name, context=context_str)
            messages_payload: list[tuple[str, str]] = [("system", prompt)]

            # Include recent conversation turns for continuous context
            if convos:
                for c in reversed(convos[-6:]):
                    if c.content.strip() != message.strip():
                        role = "human" if c.role == "user" else "assistant"
                        messages_payload.append((role, c.content))

            messages_payload.append(("human", message))

            logger.info("Calling LLM model=%s for message: %.40s", settings.llm_model, message)
            response = model.invoke(messages_payload)

            if isinstance(response.content, str):
                answer = response.content
            elif isinstance(response.content, list):
                answer = "\n".join(
                    str(b.get("text", "")) if isinstance(b, dict) else str(b)
                    for b in response.content
                )
            else:
                answer = str(response.content)

        except Exception as exc:
            logger.warning("LLM call encountered error (%s); falling back to standalone responder", exc)
            answer = None

    # 4. Fallback if LLM is offline or timed out
    if not answer:
        answer = _spontaneous_answer(data, message)

    explanation = (
        f"Grounded response using {client_name}'s client record and {len(memory_ids)} relevant memory item(s)."
        if memory_ids
        else f"Answered directly as your AI assistant (with {client_name}'s dossier on hand)."
    )

    return answer, memory_ids, explanation
