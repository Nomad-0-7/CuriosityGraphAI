from abc import ABC, abstractmethod
from dataclasses import dataclass

SYSTEM_PROMPT = """You are a document-grounded assistant.

Answer the user's question using ONLY the supplied document context.

Rules:
1. Do not invent information that is not supported by the context.
2. Do not use outside knowledge.
3. If the supplied context does not contain enough information to answer the question, clearly state that the answer could not be found in the document.
4. Use the retrieved context as the source of truth.
5. Do not mention that you are following rules.
"""


@dataclass
class LLMContext:
    page: int
    content: str


def build_user_prompt(question: str, contexts: list[LLMContext]) -> str:
    if not contexts:
        context_block = "No context available."
    else:
        parts = []
        for context in contexts:
            parts.append(f"[Page {context.page}]\n{context.content}")
        context_block = "\n\n".join(parts)

    return f"DOCUMENT CONTEXT:\n{context_block}\n\nUSER QUESTION:\n{question}"


class BaseLLM(ABC):
    """
    Provider-agnostic LLM interface.

    The RAG pipeline depends on this abstraction, not on OpenAI/Gemini details.
    """

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def _call_provider(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError

    def generate(self, question: str, contexts: list[LLMContext]) -> str:
        user_prompt = build_user_prompt(question=question, contexts=contexts)
        answer = self._call_provider(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        return answer.strip()