import httpx

from app.core.exceptions import LLMProviderError
from app.services.llm.base import BaseLLM


class GoogleGeminiLLM(BaseLLM):
    """
    Google Gemini generateContent adapter.
    """

    def _call_provider(self, system_prompt: str, user_prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
            },
        }

        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=120.0)
            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMProviderError("Google Gemini returned no candidates.")

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise LLMProviderError("Google Gemini returned an empty response.")

            return "".join(part.get("text", "") for part in parts).strip()

        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code

            try:
                body = exc.response.json()
                message = body.get("error", {}).get("message", "LLM request failed.")
            except Exception:
                message = "LLM request failed."

            if status in {400, 401, 403}:
                raise LLMProviderError(
                    "Google Gemini authentication or request configuration failed. Check your API key and model."
                ) from exc

            if status == 404:
                raise LLMProviderError(
                    f"Google Gemini model '{self.model}' was not found."
                ) from exc

            if status == 429:
                raise LLMProviderError("Google Gemini rate limit exceeded.") from exc

            raise LLMProviderError(f"Google Gemini API error: {message}") from exc

        except (httpx.RequestError, KeyError, IndexError) as exc:
            raise LLMProviderError("Could not reach or parse the Google Gemini API response.") from exc