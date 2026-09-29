"""Unit tests for the requirements advisor and ingestion service."""
from unittest.mock import MagicMock, patch
from app.services.requirements_advisor import (
    analyze_client_requirements,
    RequirementsAnalysisOutput,
    IngestedMemory,
    ScopeAndRequirementSuggestion,
    PaymentMilestoneSuggestion,
)


def test_requirements_advisor_returns_fallback_when_no_api_key():
    """Service gracefully returns a basic structure if LLM API key is absent."""
    with patch("app.services.requirements_advisor.settings") as mock_settings:
        mock_settings.llm_api_key = ""
        result = analyze_client_requirements("Build me an e-commerce website with 5 pages", source="whatsapp")
        assert result.summary != ""
        assert len(result.payment_suggestions) > 0
        assert any(p.percentage == 40 for p in result.payment_suggestions)


def test_requirements_advisor_invokes_llm_with_structured_output():
    """Service properly constructs model and returns parsed output."""
    mock_output = RequirementsAnalysisOutput(
        summary="Client wants a 5-page portfolio with contact form.",
        client_objective="Showcase architecture projects and capture inbound leads.",
        detected_budget_inr=75000.0,
        detected_timeline="3 weeks",
        memories=[
            IngestedMemory(
                type="requirement",
                content="Requires responsive portfolio site with 5 pages",
                confidence=0.95,
                tags=["scope", "pages"],
            ),
            IngestedMemory(
                type="preference",
                content="Prefers minimalist dark aesthetic",
                confidence=0.9,
                tags=["design"],
            ),
        ],
        scope_suggestions=[
            ScopeAndRequirementSuggestion(
                category="missing_info",
                title="Content & High-res imagery",
                detail="Client has not stated whether photography and copy are ready.",
                suggested_action="Request existing portfolio assets before kickoff.",
            )
        ],
        payment_suggestions=[
            PaymentMilestoneSuggestion(
                title="Advance Deposit (40%)",
                percentage=40,
                recommended_amount_inr=30000.0,
                trigger="Upon contract signing",
                reasoning="Covers discovery and visual direction",
            ),
            PaymentMilestoneSuggestion(
                title="Milestone Delivery (40%)",
                percentage=40,
                recommended_amount_inr=30000.0,
                trigger="Design and staging approval",
                reasoning="Ensures progress payment before deployment",
            ),
            PaymentMilestoneSuggestion(
                title="Final Handover (20%)",
                percentage=20,
                recommended_amount_inr=15000.0,
                trigger="Domain launch and final code delivery",
                reasoning="Closing payment upon satisfaction",
            ),
        ],
        questions_to_ask_client=[
            "Do you have branding assets and photography ready?",
            "Who will be responsible for hosting and domain registration?",
        ],
    )

    with patch("app.services.requirements_advisor.settings") as mock_settings, \
         patch("app.services.requirements_advisor.get_chat_model") as mock_get_chat_model:
        mock_settings.llm_api_key = "test-key"
        mock_model = MagicMock()
        mock_structured = MagicMock()
        mock_structured.invoke.return_value = mock_output
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_chat_model.return_value = mock_model

        result = analyze_client_requirements("I need a portfolio site, budget 75k in 3 weeks", source="whatsapp", client_name="Arjun")
        assert result.detected_budget_inr == 75000.0
        assert len(result.memories) == 2
        assert len(result.payment_suggestions) == 3
        assert result.payment_suggestions[0].recommended_amount_inr == 30000.0
