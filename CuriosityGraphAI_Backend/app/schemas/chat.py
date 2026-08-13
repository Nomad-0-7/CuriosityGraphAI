from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        examples=["What is the first rule of functions?"],
    )
    thread_id: Optional[str] = Field(
        default=None,
        examples=["e0b7f5a4-5f7e-4a3b-9c1d-3d1b9c6b7a88"],
    )

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("question cannot be empty")
        return value


class SourceOut(BaseModel):
    chunk_id: str
    page: int
    similarity: float
    snippet: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceOut]
    thread_id: str
    document_id: str


class ThreadCreate(BaseModel):
    document_id: str
    title: Optional[str] = None


class ThreadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    title: str
    created_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    thread_id: str
    role: str
    content: str
    sources: Optional[List[SourceOut]] = None
    created_at: datetime