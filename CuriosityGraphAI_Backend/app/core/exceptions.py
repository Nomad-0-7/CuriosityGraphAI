class CuriosityGraphAIError(Exception):
    """Base application error."""


class DocumentNotFoundError(CuriosityGraphAIError):
    pass


class DocumentNotIndexedError(CuriosityGraphAIError):
    pass


class PDFProcessingError(CuriosityGraphAIError):
    pass


class NoExtractableTextError(PDFProcessingError):
    pass


class ChunkingError(CuriosityGraphAIError):
    pass


class EmbeddingError(CuriosityGraphAIError):
    pass


class VectorStoreError(CuriosityGraphAIError):
    pass


class LLMConfigError(CuriosityGraphAIError):
    pass


class UnsupportedLLMProviderError(CuriosityGraphAIError):
    pass


class LLMProviderError(CuriosityGraphAIError):
    pass