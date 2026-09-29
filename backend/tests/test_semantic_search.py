"""Unit tests for semantic search and embedding fallback."""
from unittest.mock import patch, MagicMock
import sys
from app.services.semantic_search import embed_text


def test_embed_text_returns_none_for_gemini_without_embedding_key():
    """Gemini LLM key should not be passed to OpenAIEmbeddings."""
    with patch("app.services.semantic_search.settings") as mock_settings:
        mock_settings.llm_model = "gemini-1.5-flash"
        mock_settings.llm_api_key = "gemini-key"
        mock_settings.embedding_api_key = ""
        mock_settings.embedding_model = "text-embedding-3-large"
        
        result = embed_text("test query")
        assert result is None


def test_embed_text_uses_embedding_api_key_when_provided():
    """Explicit EMBEDDING_API_KEY is passed to OpenAIEmbeddings."""
    mock_openai_module = MagicMock()
    instance = mock_openai_module.OpenAIEmbeddings.return_value
    instance.embed_query.return_value = [0.1] * 1536

    with patch("app.services.semantic_search.settings") as mock_settings, \
         patch.dict(sys.modules, {"langchain_openai": mock_openai_module}):
        mock_settings.llm_model = "gemini-1.5-flash"
        mock_settings.llm_api_key = "gemini-key"
        mock_settings.embedding_api_key = "openai-embed-key"
        mock_settings.embedding_model = "text-embedding-3-large"
        
        result = embed_text("test query")
        assert result == [0.1] * 1536
        mock_openai_module.OpenAIEmbeddings.assert_called_once_with(
            model="text-embedding-3-large",
            dimensions=1536,
            api_key="openai-embed-key",
        )
