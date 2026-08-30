import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, LargeBinary, String, Text

from app.database.connection import Base


def utcnow():
    return datetime.now(timezone.utc)


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(
        String,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)

    # Embedding is stored as a float32 byte array.
    # For this local-first SQLite implementation, vector scoring is done in Python/NumPy.
    embedding = Column(LargeBinary, nullable=False)

    created_at = Column(DateTime, nullable=False, default=utcnow)