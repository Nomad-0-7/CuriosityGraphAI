from typing import Optional

from pydantic import BaseModel, Field


class LLMSettingsIn(BaseModel):
    provider: str = Field(..., examples=["openai", "google"])
    model: Optional[str] = Field(default=None, examples=["gpt-4o-mini", "gemini-2.0-flash"])
    api_key: Optional[str] = Field(default=None, examples=["sk-..."])


class LLMSettingsOut(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    has_api_key: bool = False