import datetime
import logging
import uuid
from pathlib import Path

from app.core.exceptions import EmbeddingError
from app.database.connection import SessionLocal
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.services import chunking_service, pdf_service
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


def process_document(document_id: str) -> None:
    """
    Full ingestion pipeline:

    PDF file
      -> page-by-page extraction
      -> chunking
      -> embedding
      -> SQLite chunk storage
      -> INDEXED status

    If any step fails, the document is marked FAILED with a real error message.
    """
    db = SessionLocal()

    try:
        document = db.get(Document, document_id)
        if not document:
            return

        document.status = "PROCESSING"
        document.updated_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()

        try:
            pages = pdf_service.extract_pages(Path(document.file_path))
            drafts = chunking_service.build_chunks(pages)

            texts = [draft.content for draft in drafts]
            vectors = embedding_service.encode_texts(texts)

            if len(vectors) != len(drafts):
                raise EmbeddingError(
                    "Embedding generation returned an unexpected number of vectors."
                )

            chunks = []
            for chunk_index, (draft, vector) in enumerate(zip(drafts, vectors)):
                chunks.append(
                    DocumentChunk(
                        id=str(uuid.uuid4()),
                        document_id=document.id,
                        chunk_index=chunk_index,
                        page_number=draft.page_number,
                        content=draft.content,
                        token_count=draft.token_count,
                        embedding=embedding_service.embedding_to_bytes(vector),
                    )
                )

            db.add_all(chunks)

            document.total_pages = len(pages)
            document.status = "INDEXED"
            document.error_message = None
            document.updated_at = datetime.datetime.now(datetime.timezone.utc)

            db.commit()

        except Exception as exc:
            db.rollback()
            logger.exception("Document ingestion failed for document_id=%s", document_id)

            document = db.get(Document, document_id)
            if document:
                document.status = "FAILED"
                document.error_message = str(exc)[:2000]
                document.updated_at = datetime.datetime.now(datetime.timezone.utc)
                db.commit()

    finally:
        db.close()