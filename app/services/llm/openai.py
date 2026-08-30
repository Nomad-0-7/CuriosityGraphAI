import httpx

from app.core.exceptions import LLMProviderError
from app.services.llm.base import BaseLLM


class OpenAILLM(BaseLLM):
    """
    OpenAI chat-completions adapter.
    """

    def _call_provider(self, system_prompt: str, user_prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=120.0)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code

            try:
                body = exc.response.json()
                message = body.get("error", {}).get("message", "LLM request failed.")
            except Exception:
                message = "LLM request failed."

            if status in {401, 403}:
                raise LLMProviderError(
                    "OpenAI authentication failed. Check your API key."
                ) from exc

            if status == 404:
                raise LLMProviderError(
                    f"OpenAI model '{self.model}' was not found."
                ) from exc

            if status == 429:
                raise LLMProviderError("OpenAI rate limit exceeded.") from exc

            raise LLMProviderError(f"OpenAI API error: {message}") from exc

        except (httpx.RequestError, KeyError, IndexError) as exc:
            raise LLMProviderError("Could not reach or parse the OpenAI API response.") from exc