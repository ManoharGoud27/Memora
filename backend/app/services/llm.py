"""Construct a supported LangChain chat model from environment settings."""
from langchain_core.language_models import BaseChatModel
from app.core.config import settings


def get_chat_model(temperature: float = 0) -> BaseChatModel:
    """Choose Gemini, Claude, or OpenAI based on the configured model name."""
    model_name = settings.llm_model.lower()
    if model_name.startswith("gemini"):
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.llm_api_key,
            temperature=temperature,
        )
    if model_name.startswith("claude"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=settings.llm_model, api_key=settings.llm_api_key, temperature=temperature)
    from langchain_openai import ChatOpenAI
    key = settings.llm_api_key.strip()
    if key and not key.startswith("sk-"):
        key = f"sk-proj-{key}"
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=key,
        temperature=temperature,
        timeout=15,
        max_retries=1,
    )

