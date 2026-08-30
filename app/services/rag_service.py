from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    DocumentNotFoundError,
    DocumentNotIndexedError,
    EmbeddingError,
)
from app.models.document import Document
from app.services.embedding_service import embedding_service
from app.services.llm.base import LLMContext
from app.services.llm.factory import LLMFactory
from app.services.retrieval_service import RetrievedChunk, search
from app.services.settings_service import settings_manager

NOT_FOUND_ANSWER = (
    "I couldn't find information about that in the selected document."
)


@dataclass
class RagSource:
    chunk_id: str
    page: int
    similarity: float
    snippet: str


@dataclass
class RagResult:
    answer: str
    sources: list[RagSource]


def generate_answer(
    session: Session,
    document_id: str,
    question: str,
) -> RagResult:
    """
    Core RAG pipeline:

    question
      -> embedding
      -> vector search scoped to document_id
      -> relevance filtering
      -> grounded prompt
      -> user-configured LLM
      -> answer + real sources
    """
    document = session.get(Document, document_id)
    if not document:
        raise DocumentNotFoundError("Document not found.")

    if document.status != "INDEXED":
        raise DocumentNotIndexedError(
            f"Document is not ready for chat. Current status: {document.status}."
        )

    # This raises LLMConfigError if provider/model/key are missing.
    config = settings_manager.get_config()

    try:
        query_embedding = embedding_service.encode_query(question)
    except EmbeddingError:
        raise

    retrieved: list[RetrievedChunk] = search(
        session=session,
        document_id=document_id,
        query_embedding=query_embedding,
        top_k=settings.retrieval_top_k,
    )

    # Relevance threshold:
    # With normalized MiniLM embeddings, cosine similarity often lands in the
    # 0.2-0.6 range for reasonably related short passages.
    # 0.20 is a conservative default for local-first retrieval.
    # It can be raised if irrelevant passages leak through.
    relevant = [
        item
        for item in retrieved
        if item.similarity >= settings.retrieval_min_score
    ]

    if not relevant:
        return RagResult(answer=NOT_FOUND_ANSWER, sources=[])

    contexts = [
        LLMContext(page=item.page_number, content=item.content)
        for item in relevant
    ]

    llm = LLMFactory.create(
        provider=config.provider,
        api_key=config.api_key,
        model=config.model,
    )

    answer = llm.generate(question=question, contexts=contexts)

    sources = [
        RagSource(
            chunk_id=item.chunk_id,
            page=item.page_number,
            similarity=round(item.similarity, 4),
            snippet=item.content[:250],
        )
        for item in relevant
    ]

    return RagResult(answer=answer, sources=sources)