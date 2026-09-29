"""Unit tests for chat model provider selection."""
from unittest.mock import patch, MagicMock
import sys
import pytest
from app.services.llm import get_chat_model


def test_get_chat_model_gemini():
    """Verify get_chat_model returns ChatGoogleGenerativeAI for gemini models."""
    with patch("app.services.llm.settings") as mock_settings, \
         patch("langchain_google_genai.ChatGoogleGenerativeAI") as mock_gemini:
        mock_settings.llm_model = "gemini-3.8-flash"
        mock_settings.llm_api_key = "test-gemini-key"
        
        get_chat_model(temperature=0.5)
        
        mock_gemini.assert_called_once_with(
            model="gemini-3.8-flash",
            google_api_key="test-gemini-key",
            temperature=0.5,
        )


def test_get_chat_model_claude():
    """Verify get_chat_model returns ChatAnthropic for claude models."""
    mock_anthropic_module = MagicMock()
    with patch("app.services.llm.settings") as mock_settings, \
         patch.dict(sys.modules, {"langchain_anthropic": mock_anthropic_module}):
        mock_settings.llm_model = "claude-sonnet-4-2026"
        mock_settings.llm_api_key = "test-claude-key"
        
        get_chat_model(temperature=0.2)
        
        mock_anthropic_module.ChatAnthropic.assert_called_once_with(
            model="claude-sonnet-4-2026",
            api_key="test-claude-key",
            temperature=0.2,
        )


def test_get_chat_model_openai():
    """Verify get_chat_model returns ChatOpenAI for OpenAI/default models."""
    mock_openai_module = MagicMock()
    with patch("app.services.llm.settings") as mock_settings, \
         patch.dict(sys.modules, {"langchain_openai": mock_openai_module}):
        mock_settings.llm_model = "gpt-4o"
        mock_settings.llm_api_key = "test-openai-key"
        
        get_chat_model(temperature=0.0)
        
        mock_openai_module.ChatOpenAI.assert_called_once_with(
            model="gpt-4o",
            api_key="test-openai-key",
            temperature=0.0,
        )
