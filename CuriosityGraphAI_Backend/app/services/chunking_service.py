import re
from dataclasses import dataclass

from app.core.config import settings
from app.core.exceptions import ChunkingError


@dataclass
class ChunkDraft:
    page_number: int
    content: str
    token_count: int


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _estimate_tokens(text: str) -> int:
    # Rough approximation for English-ish text.
    # This is not a tokenizer-accurate count, but is good enough for chunk metadata in v1.
    return max(1, len(text) // 4)


def _split_page_text(text: str, max_chars: int, overlap_chars: int) -> list[str]:
    """
    Split one page of text into overlapping chunks.

    This intentionally keeps chunks within a single page in v1 so citations
    remain simple and accurate.
    """
    text = text.strip()
    if not text:
        return []

    if len(text) <= max_chars:
        return [text]

    if overlap_chars >= max_chars:
        overlap_chars = max(0, max_chars // 5)

    chunks: list[str] = []
    start = 0

    while start < len(text):
        end = min(start + max_chars, len(text))

        # Try to break on a nearby space so we do not cut words unnecessarily.
        if end < len(text):
            boundary = text.rfind(" ", start, end)
            if boundary > start + (max_chars // 2):
                end = boundary

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        # Move forward, but keep some overlap from the previous chunk.
        start = max(end - overlap_chars, start + 1)

    return chunks


def build_chunks(pages: list[tuple[int, str]]) -> list[ChunkDraft]:
    """
    Build page-aware chunks from extracted PDF pages.

    Chunking choices:
    - default chunk size: 800 characters
    - default overlap: 150 characters

    Why:
    - all-MiniLM-L6-v2 works best with relatively short passages.
    - 800 characters is typically around 200 tokens, which is safe for this model.
    - overlap helps preserve context at chunk boundaries.
    - keeping chunks inside pages keeps citations simple and reliable in v1.
    """
    chunk_size = max(200, settings.chunk_size)
    chunk_overlap = max(0, settings.chunk_overlap)

    drafts: list[ChunkDraft] = []

    for page_number, page_text in pages:
        normalized = _normalize_whitespace(page_text)
        if not normalized:
            continue

        page_chunks = _split_page_text(
            text=normalized,
            max_chars=chunk_size,
            overlap_chars=chunk_overlap,
        )

        for chunk_text in page_chunks:
            drafts.append(
                ChunkDraft(
                    page_number=page_number,
                    content=chunk_text,
                    token_count=_estimate_tokens(chunk_text),
                )
            )

    if not drafts:
        raise ChunkingError("No chunks could be created from this document.")

    return drafts