from app.database.connection import SessionLocal
from app.services.embedding_service import embedding_service
from app.services.retrieval_service import search


def test_document_scoped_retrieval(client, upload_pdf):
    response_a = upload_pdf(
        "apples.pdf",
        ["Apples are red, round, and sweet."],
    )
    response_b = upload_pdf(
        "bananas.pdf",
        ["Bananas are yellow, long, and rich in potassium."],
    )

    assert response_a.status_code == 201
    assert response_b.status_code == 201

    doc_a = response_a.json()
    doc_b = response_b.json()

    assert doc_a["status"] == "INDEXED"
    assert doc_b["status"] == "INDEXED"

    question = "What color are apples?"
    query_embedding = embedding_service.encode_query(question)

    db = SessionLocal()
    try:
        results = search(
            session=db,
            document_id=doc_a["id"],
            query_embedding=query_embedding,
            top_k=5,
        )
    finally:
        db.close()

    assert len(results) > 0

    for result in results:
        assert result.document_id == doc_a["id"]
        assert result.document_id != doc_b["id"]
        assert result.page_number >= 1
        assert result.content