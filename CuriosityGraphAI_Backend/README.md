CuriosityGraphAI Backend

Local-first, document-scoped RAG API.

This backend implements a real retrieval-augmented generation pipeline:

1. Upload a PDF.
2. Extract text page-by-page with PyMuPDF.
3. Chunk text while preserving page numbers.
4. Embed chunks locally with `sentence-transformers/all-MiniLM-L6-v2`.
5. Store chunks and embeddings in SQLite.
6. Retrieve chunks using cosine similarity scoped to one document.
7. Send retrieved context to a user-configured LLM.
8. Return a grounded answer with real citations.

This is not a global chatbot. Every chat is scoped to exactly one PDF.

Technology choices

Backend

- FastAPI
- Pydantic v2
- SQLAlchemy 2.x
- SQLite

PDF parsing

- PyMuPDF (`fitz`)

Embeddings

- `sentence-transformers/all-MiniLM-L6-v2`
- 384-dimensional embeddings
- Model is loaded once and reused.

Vector search

This implementation stores embeddings in SQLite as binary float32 arrays and scores them with NumPy.

Why this approach?

- Zero extra services.
- No native vector DB extension required.
- Very easy to run locally.
- Document-scoped retrieval is simple and reliable.
- Good enough for local-first single-user workloads.

The retrieval layer is isolated in `app/services/retrieval_service.py`, so it can later be replaced with `sqlite-vec` or another local vector index without changing the API.

LLM providers

Supported:

- OpenAI
- Google Gemini

The RAG pipeline uses a provider abstraction:

```text
RAG service
  -> LLM interface
    -> provider adapter
```
