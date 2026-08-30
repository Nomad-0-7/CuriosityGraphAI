from app.core.exceptions import LLMConfigError, UnsupportedLLMProviderError
from app.services.llm.base import BaseLLM
from app.services.llm.gemini import GoogleGeminiLLM
from app.services.llm.openai import OpenAILLM


class LLMFactory:
    """
    Creates a provider-specific LLM adapter from generic configuration.

    This keeps provider logic out of the RAG pipeline.
    """

    @staticmethod
    def create(provider: str, api_key: str, model: str) -> BaseLLM:
        if not provider:
            raise LLMConfigError("LLM provider is required.")

        if not api_key:
            raise LLMConfigError("LLM API key is required.")

        if not model:
            raise LLMConfigError("LLM model is required.")

        normalized = provider.strip().lower()

        if normalized == "openai":
            return OpenAILLM(api_key=api_key, model=model)

        if normalized in {"google", "gemini"}:
            return GoogleGeminiLLM(api_key=api_key, model=model)

        raise UnsupportedLLMProviderError(
            f"Unsupported LLM provider '{provider}'. Supported providers: openai, google."
        )