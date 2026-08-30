import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.connection import Base


def utcnow():
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    total_pages = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="UPLOADED")
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    chunks = relationship(
        "DocumentChunk",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    threads = relationship(
        "ChatThread",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )