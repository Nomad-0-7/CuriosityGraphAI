import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text

from app.database.connection import Base


def utcnow():
    return datetime.now(timezone.utc)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(
        String,
        ForeignKey("chat_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # "user" or "assistant"
    role = Column(String, nullable=False)

    content = Column(Text, nullable=False)

    # JSON list of source objects:
    # [{"chunk_id": "...", "page": 12, "similarity": 0.41, "snippet": "..."}]
    sources = Column(JSON, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow)