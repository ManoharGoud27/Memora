"""AI-powered client requirements ingestion, memory extraction, and commercial advisor."""
from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.llm import get_chat_model


class IngestedMemory(BaseModel):
    type: Literal["preference", "feedback", "decision", "requirement", "task", "deadline", "fact", "outcome"]
    content: str = Field(description="A concise, standalone fact that will remain useful later")
    confidence: float = Field(ge=0, le=1)
    tags: list[str] = Field(default_factory=list)


class PaymentMilestoneSuggestion(BaseModel):
    title: str = Field(description="Name of the milestone, e.g., 'Advance Deposit (40%)'")
    percentage: int = Field(description="Percentage share of the total project budget")
    recommended_amount_inr: float | None = Field(default=None, description="Suggested amount in Indian Rupees (INR ₹)")
    trigger: str = Field(description="Deliverable or kickoff event that unlocks this payment")
    reasoning: str = Field(description="Why this milestone protects the freelancer")


class ScopeAndRequirementSuggestion(BaseModel):
    category: Literal["scope_risk", "missing_info", "tech_stack", "change_recommendation"]
    title: str = Field(description="Short title of the suggestion")
    detail: str = Field(description="Detailed explanation of the observation or gap")
    suggested_action: str = Field(description="What the freelancer should do or recommend to the client")


class RequirementsAnalysisOutput(BaseModel):
    summary: str = Field(description="Executive summary of the client requirements and conversation in 2-3 sentences")
    client_objective: str = Field(description="Primary business goal or target outcome the client wants to achieve")
    detected_budget_inr: float | None = Field(default=None, description="Detected or estimated budget in INR (₹)")
    detected_timeline: str | None = Field(default=None, description="Expected timeline or completion deadline")
    memories: list[IngestedMemory] = Field(default_factory=list, description="Extracted durable memories for long-term client context")
    scope_suggestions: list[ScopeAndRequirementSuggestion] = Field(default_factory=list, description="Actionable suggestions on requirements, missing info, and changes needed")
    payment_suggestions: list[PaymentMilestoneSuggestion] = Field(default_factory=list, description="Recommended payment milestone schedule in Indian Rupees (INR ₹)")
    questions_to_ask_client: list[str] = Field(default_factory=list, description="Specific follow-up questions to clarify scope with the client via WhatsApp or Email")


def _get_fallback_analysis(raw_content: str) -> RequirementsAnalysisOutput:
    """Fallback response when LLM is unavailable."""
    snippet = raw_content.strip()[:160] + "..." if len(raw_content) > 160 else raw_content.strip()
    return RequirementsAnalysisOutput(
        summary=f"Client brief captured: {snippet}",
        client_objective="Deliver requested project deliverables according to specifications.",
        detected_budget_inr=None,
        detected_timeline="To be agreed upon",
        memories=[
            IngestedMemory(
                type="requirement",
                content=snippet,
                confidence=0.8,
                tags=["imported-notes"],
            )
        ],
        scope_suggestions=[
            ScopeAndRequirementSuggestion(
                category="missing_info",
                title="Detailed Scope & Deliverables Checklist",
                detail="Clarify exact page count, integrations, and asset delivery dates before kickoff.",
                suggested_action="Send a detailed scope of work agreement outlining milestones and included revisions.",
            )
        ],
        payment_suggestions=[
            PaymentMilestoneSuggestion(
                title="Advance Deposit (40%)",
                percentage=40,
                recommended_amount_inr=None,
                trigger="Required before project initiation",
                reasoning="Secures your booking calendar and covers initial discovery and architecture work.",
            ),
            PaymentMilestoneSuggestion(
                title="Progress Milestone (40%)",
                percentage=40,
                recommended_amount_inr=None,
                trigger="Upon delivery of first functional prototype/staging demo",
                reasoning="Validates client satisfaction halfway through development.",
            ),
            PaymentMilestoneSuggestion(
                title="Final Handover (20%)",
                percentage=20,
                recommended_amount_inr=None,
                trigger="Prior to final code handover or production server deployment",
                reasoning="Protects your intellectual property until final settlement.",
            ),
        ],
        questions_to_ask_client=[
            "Who will be responsible for providing text content, high-resolution imagery, and branding assets?",
            "Do you have existing server hosting, domains, or third-party service accounts already created?",
            "What is your target go-live date and are there any hard marketing deadlines?",
        ],
    )


def analyze_client_requirements(
    raw_content: str,
    source: str = "notes",
    client_name: str | None = None,
) -> RequirementsAnalysisOutput:
    """Analyze client notes/chat text using LLM, returning structured memories and commercial advice."""
    if not settings.llm_api_key or not raw_content.strip():
        return _get_fallback_analysis(raw_content)

    client_context = f"Client Name: {client_name}\n" if client_name else ""
    system_prompt = (
        "You are an expert freelance business advisor and project strategist.\n"
        "A freelancer has received client communications (from WhatsApp, Email, Slack, or meeting notes).\n"
        "Your mission:\n"
        "1. Summarize the requirements and identify the client's underlying business objective.\n"
        "2. Extract durable, high-value client memories (preferences, functional requirements, technical constraints, deadlines, budget).\n"
        "3. Identify gaps, scope risks, missing specifications, and changes needed to prevent scope creep.\n"
        "4. Recommend a secure milestone payment schedule in Indian Rupees (INR ₹) tailored for Indian freelancers.\n"
        "   - Standard best practice: 40% upfront advance, 40% staging/design milestone, 20% final signoff.\n"
        "   - If a budget in INR or other currency is mentioned, convert and calculate the exact INR amounts for each milestone.\n"
        "5. Formulate 3-5 sharp, polite clarification questions the freelancer can send directly to the client via WhatsApp or Email."
    )

    user_prompt = (
        f"{client_context}Source Platform: {source.upper()}\n\n"
        f"--- RAW CLIENT COMMUNICATION ---\n{raw_content}\n---------------------------------"
    )

    try:
        model = get_chat_model(temperature=0.1).with_structured_output(RequirementsAnalysisOutput)
        result = model.invoke([
            ("system", system_prompt),
            ("human", user_prompt),
        ])
        return result
    except Exception:
        return _get_fallback_analysis(raw_content)
