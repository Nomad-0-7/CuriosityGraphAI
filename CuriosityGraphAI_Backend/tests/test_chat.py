from app.services.settings_service import settings_manager


class DummyLLM:
    def generate(self, question: str, contexts: list) -> str:
        return f"Grounded answer using {len(contexts)} retrieved context chunks."


def fake_llm_factory(provider: str, api_key: str, model: str):
    return DummyLLM()


def test_chat_returns_answer_and_sources(client, upload_pdf, monkeypatch):
    upload_response = upload_pdf(
        "clean-code.pdf",
        ["The first rule of functions is that they should be small."],
    )

    document = upload_response.json()
    document_id = document["id"]

    settings_manager.configure(
        provider="openai",
        model="gpt-4o-mini",
        api_key="test-key",
    )

    monkeypatch.setattr(
        "app.services.rag_service.LLMFactory.create",
        fake_llm_factory,
    )

    chat_response = client.post(
        f"/api/chat/{document_id}",
        json={"question": "What is the first rule of functions?"},
    )

    assert chat_response.status_code == 200
    body = chat_response.json()

    assert body["document_id"] == document_id
    assert body["thread_id"]
    assert body["answer"]
    assert len(body["sources"]) >= 1

    source = body["sources"][0]
    assert source["page"] == 1
    assert source["chunk_id"]
    assert "similarity" in source

    thread_id = body["thread_id"]

    messages_response = client.get(f"/api/chat/threads/{thread_id}/messages")
    assert messages_response.status_code == 200

    messages = messages_response.json()
    assert len(messages) == 2

    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["sources"] is not None


def test_chat_missing_llm_configuration(client, upload_pdf):
    upload_response = upload_pdf(
        "no-config.pdf",
        ["Some content."],
    )

    document_id = upload_response.json()["id"]

    settings_manager.reset()

    response = client.post(
        f"/api/chat/{document_id}",
        json={"question": "What does this document say?"},
    )

    assert response.status_code == 400
    assert "No LLM provider is configured" in response.json()["detail"]


def test_chat_with_missing_document(client):
    settings_manager.configure(
        provider="openai",
        model="gpt-4o-mini",
        api_key="test-key",
    )

    response = client.post(
        "/api/chat/missing-document",
        json={"question": "Hello?"},
    )

    assert response.status_code == 404


def test_thread_crud(client, upload_pdf):
    upload_response = upload_pdf("threads.pdf", ["Thread test content."])
    document_id = upload_response.json()["id"]

    create_response = client.post(
        "/api/chat/threads",
        json={
            "document_id": document_id,
            "title": "My thread",
        },
    )

    assert create_response.status_code == 201
    thread = create_response.json()

    assert thread["document_id"] == document_id
    assert thread["title"] == "My thread"

    get_response = client.get(f"/api/chat/threads/{thread['id']}")
    assert get_response.status_code == 200

    messages_response = client.get(f"/api/chat/threads/{thread['id']}/messages")
    assert messages_response.status_code == 200
    assert messages_response.json() == []

    delete_response = client.delete(f"/api/chat/threads/{thread['id']}")
    assert delete_response.status_code == 200

    missing_response = client.get(f"/api/chat/threads/{thread['id']}")
    assert missing_response.status_code == 404


def test_chat_rejects_thread_from_other_document(client, upload_pdf):
    response_a = upload_pdf("doc-a.pdf", ["Document A content."])
    response_b = upload_pdf("doc-b.pdf", ["Document B content."])

    doc_a_id = response_a.json()["id"]
    doc_b_id = response_b.json()["id"]

    thread_response = client.post(
        "/api/chat/threads",
        json={"document_id": doc_b_id, "title": "Thread for B"},
    )

    thread_b_id = thread_response.json()["id"]

    settings_manager.configure(
        provider="openai",
        model="gpt-4o-mini",
        api_key="test-key",
    )

    chat_response = client.post(
        f"/api/chat/{doc_a_id}",
        json={
            "question": "What does this document say?",
            "thread_id": thread_b_id,
        },
    )

    assert chat_response.status_code == 404