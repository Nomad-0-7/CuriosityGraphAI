import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database.connection import Base


def utcnow():
    return datetime.now(timezone.utc)


class ChatThread(Base):
    __tablename__ = "chat_threads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(
        String,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    messages = relationship(
        "ChatMessage",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )