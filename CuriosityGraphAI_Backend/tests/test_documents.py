def test_upload_pdf_and_index(client, upload_pdf):
    response = upload_pdf(
        "sample.pdf",
        ["The first rule of functions is that they should be small."],
    )

    assert response.status_code == 201
    body = response.json()

    assert body["title"] == "sample"
    assert body["status"] == "INDEXED"
    assert body["total_pages"] == 1
    assert body["file_size_bytes"] > 0

    document_id = body["id"]

    status_response = client.get(f"/api/documents/{document_id}/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "INDEXED"

    list_response = client.get("/api/documents")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    file_response = client.get(f"/api/documents/{document_id}/file")
    assert file_response.status_code == 200
    assert file_response.headers["content-type"] == "application/pdf"
    assert len(file_response.content) > 0


def test_non_pdf_upload_is_rejected(client):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]


def test_corrupt_pdf_upload_is_rejected(client):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("bad.pdf", b"this is not a real pdf", "application/pdf")},
    )

    assert response.status_code == 400
    assert "could not be parsed as a PDF" in response.json()["detail"]


def test_missing_document_returns_404(client):
    response = client.get("/api/documents/does-not-exist")
    assert response.status_code == 404


def test_delete_document(client, upload_pdf):
    upload_response = upload_pdf("to-delete.pdf", ["Temporary content."])
    document_id = upload_response.json()["id"]

    delete_response = client.delete(f"/api/documents/{document_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True

    get_response = client.get(f"/api/documents/{document_id}")
    assert get_response.status_code == 404