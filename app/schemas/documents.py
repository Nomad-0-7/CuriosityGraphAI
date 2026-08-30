from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    file_size_bytes: int
    total_pages: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    total_pages: Optional[int] = None
    error_message: Optional[str] = None


class DeletedOut(BaseModel):
    deleted: bool