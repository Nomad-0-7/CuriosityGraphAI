from fastapi import APIRouter, HTTPException

from app.core.exceptions import UnsupportedLLMProviderError
from app.schemas.settings import LLMSettingsIn, LLMSettingsOut
from app.services.settings_service import settings_manager

router = APIRouter()


@router.get(
    "/llm",
    response_model=LLMSettingsOut,
    summary="Get current LLM configuration",
    description="Returns provider/model configuration without exposing the API key.",
)
def get_llm_settings():
    return settings_manager.get_safe()


@router.post(
    "/llm",
    response_model=LLMSettingsOut,
    summary="Configure LLM provider",
    description=(
        "Configure the LLM provider, model, and API key at runtime. "
        "The API key is kept in memory and is never returned by this API."
    ),
)
def configure_llm(payload: LLMSettingsIn):
    try:
        settings_manager.configure(
            provider=payload.provider,
            model=payload.model,
            api_key=payload.api_key,
        )
    except UnsupportedLLMProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return settings_manager.get_safe()