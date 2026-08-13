import threading
from dataclasses import dataclass

from app.core.config import settings
from app.core.exceptions import LLMConfigError, UnsupportedLLMProviderError


@dataclass
class LLMConfig:
    provider: str
    model: str
    api_key: str


class SettingsManager:
    """
    Holds user-configurable LLM settings in memory.

    Local-first API key handling:
    - Keys are not returned by GET endpoints.
    - Keys are not logged.
    - Keys are not embedded in API responses.
    - Keys may come from environment variables or runtime configuration.

    For a single-user local app, in-memory configuration is acceptable.
    If persistent settings are desired later, store non-secret settings in SQLite
    and keep secrets in OS keychain/env variables.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self.provider: str | None = None
        self.model: str | None = None
        self.api_key: str | None = None

        self._load_from_environment()

    def _normalize_provider(self, provider: str | None) -> str:
        if not provider:
            raise UnsupportedLLMProviderError("LLM provider is required.")

        provider_clean = provider.strip().lower()

        if provider_clean == "openai":
            return "openai"

        if provider_clean in {"google", "gemini", "google-gemini", "googlegemini"}:
            return "google"

        raise UnsupportedLLMProviderError(
            f"Unsupported LLM provider '{provider}'. Supported providers: openai, google."
        )

    def _default_model_for_provider(self, provider: str) -> str:
        if provider == "openai":
            return "gpt-4o-mini"
        if provider == "google":
            return "gemini-2.0-flash"
        raise UnsupportedLLMProviderError("Unsupported provider.")

    def _environment_api_key_for_provider(self, provider: str) -> str | None:
        if provider == "openai":
            return settings.openai_api_key
        if provider == "google":
            return settings.google_api_key
        return None

    def _load_from_environment(self) -> None:
        provider = settings.llm_provider
        if not provider:
            return

        try:
            normalized = self._normalize_provider(provider)
        except UnsupportedLLMProviderError:
            return

        self.provider = normalized
        self.model = settings.llm_model or self._default_model_for_provider(normalized)
        self.api_key = self._environment_api_key_for_provider(normalized)

    def configure(
        self,
        provider: str,
        model: str | None,
        api_key: str | None,
    ) -> None:
        normalized_provider = self._normalize_provider(provider)

        with self._lock:
            previous_provider = self.provider

            self.provider = normalized_provider

            if model and model.strip():
                self.model = model.strip()
            elif normalized_provider != previous_provider or not self.model:
                self.model = self._default_model_for_provider(normalized_provider)

            if api_key is not None:
                self.api_key = api_key.strip() or None
            elif normalized_provider != previous_provider:
                self.api_key = self._environment_api_key_for_provider(normalized_provider)

    def get_config(self) -> LLMConfig:
        with self._lock:
            if not self.provider:
                raise LLMConfigError(
                    "No LLM provider is configured. "
                    "Configure it via /api/settings/llm or environment variables."
                )

            if not self.model:
                raise LLMConfigError("No LLM model is configured.")

            if not self.api_key:
                raise LLMConfigError("No LLM API key is configured.")

            return LLMConfig(
                provider=self.provider,
                model=self.model,
                api_key=self.api_key,
            )

    def get_safe(self) -> dict:
        with self._lock:
            return {
                "provider": self.provider,
                "model": self.model,
                "has_api_key": bool(self.api_key),
            }

    def reset(self) -> None:
        with self._lock:
            self.provider = None
            self.model = None
            self.api_key = None


settings_manager = SettingsManager()