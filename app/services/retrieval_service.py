from dataclasses import dataclass

import numpy as np
from sqlalchemy.orm import Session

from app.models.chunk import DocumentChunk
from app.services.embedding_service import embedding_service


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    page_number: int
    content: str
    similarity: float


def search(
    session: Session,
    document_id: str,
    query_embedding: np.ndarray,
    top_k: int,
) -> list[RetrievedChunk]:
    """
    Real semantic retrieval scoped to one document.

    This implementation:
    1. Loads chunks for the requested document only.
    2. Computes cosine similarity in NumPy.
    3. Returns top-K chunks sorted by similarity.

    Why not sqlite-vec?
    - SQLite + NumPy is extremely portable for a local-first v1.
    - No native extension installation is required.
    - Document-scoped retrieval is straightforward and reliable.
    - This can later be swapped for sqlite-vec or another local vector index
      without changing the API surface.
    """
    chunks = (
        session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .all()
    )

    if not chunks:
        return []

    query = np.asarray(query_embedding, dtype=np.float32)
    query_norm = np.linalg.norm(query)
    if query_norm == 0:
        return []
    query = query / query_norm

    scored: list[RetrievedChunk] = []

    for chunk in chunks:
        try:
            vector = embedding_service.bytes_to_embedding(chunk.embedding)
        except Exception:
            continue

        if vector.size != query.size:
            continue

        vector_norm = np.linalg.norm(vector)
        if vector_norm == 0:
            continue

        vector = vector / vector_norm
        similarity = float(np.dot(vector, query))

        scored.append(
            RetrievedChunk(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                page_number=chunk.page_number,
                content=chunk.content,
                similarity=similarity,
            )
        )

    scored.sort(key=lambda item: item.similarity, reverse=True)
    return scored[: max(1, top_k)]