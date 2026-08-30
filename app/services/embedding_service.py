import threading

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.exceptions import EmbeddingError


class EmbeddingService:
    """
    Loads and reuses the embedding model.

    The model is loaded lazily once and then reused for all requests.
    This avoids reloading the model on every upload or chat request.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None
        self._lock = threading.Lock()

    def _load_model(self) -> SentenceTransformer:
        if self._model is not None:
            return self._model

        with self._lock:
            if self._model is None:
                try:
                    self._model = SentenceTransformer(self.model_name)
                except Exception as exc:
                    raise EmbeddingError(
                        f"Failed to load embedding model '{self.model_name}'."
                    ) from exc

        return self._model

    def encode_texts(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, 384), dtype=np.float32)

        model = self._load_model()

        try:
            vectors = model.encode(
                texts,
                normalize_embeddings=True,
                batch_size=16,
                show_progress_bar=False,
            )
            return np.asarray(vectors, dtype=np.float32)
        except Exception as exc:
            raise EmbeddingError("Failed to generate embeddings.") from exc

    def encode_query(self, text: str) -> np.ndarray:
        return self.encode_texts([text])[0]

    @staticmethod
    def embedding_to_bytes(vector: np.ndarray) -> bytes:
        return vector.astype(np.float32).tobytes()

    @staticmethod
    def bytes_to_embedding(data: bytes) -> np.ndarray:
        return np.frombuffer(data, dtype=np.float32)


embedding_service = EmbeddingService(settings.embedding_model)