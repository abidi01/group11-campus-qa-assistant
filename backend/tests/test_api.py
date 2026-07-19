import os
from io import BytesIO
from pathlib import Path
import sqlite3
import tempfile
import time

TEST_ROOT = Path(tempfile.gettempdir()) / f"campus-qa-test-{os.getpid()}"
os.environ["DATABASE_PATH"] = str(TEST_ROOT / "campus-qa-test.db")
os.environ["UPLOAD_DIR"] = str(TEST_ROOT / "uploads")
os.environ["DATA_DIR"] = str(TEST_ROOT / "data")
os.environ["KNOWLEDGE_BASE_DIR"] = str(TEST_ROOT / "knowledge-base")
os.environ["APP_SECRET"] = "test-secret"
os.environ["DASHSCOPE_API_KEY"] = "test-fake-key"
os.environ["DASHSCOPE_BASE_URL"] = "https://test.dashscope.example.com"
os.environ["LLM_BASE_URL"] = "https://test.dashscope.example.com/compatible-mode/v1"

from unittest.mock import MagicMock, patch

import json
import hashlib

import numpy as np
from docx import Document as DocxDocument

# 在导入 app 前 patch openai.OpenAI，让 RAG 引擎使用 fake 客户端
cache: dict[str, np.ndarray] = {}


def _fake_encode(texts: list[str]) -> np.ndarray:
    """基于字符哈希生成伪嵌入，让语义相近（共享汉字）的文本相似度更高。"""
    dim = 1024
    vecs = []
    for text in texts:
        if text not in cache:
            v = np.zeros(dim, dtype=np.float32)
            for i, ch in enumerate(text):
                ch_hash = int.from_bytes(hashlib.blake2b(ch.encode(), digest_size=4).digest(), "big")
                v[ch_hash % dim] += 1.0
                if i + 1 < len(text):
                    pair = text[i : i + 2].encode()
                    pair_hash = int.from_bytes(hashlib.blake2b(pair, digest_size=4).digest(), "big")
                    v[pair_hash % dim] += 1.5
            norm = np.linalg.norm(v)
            if norm > 0:
                v = v / norm
            cache[text] = v
        vecs.append(cache[text])
    return np.stack(vecs)


def _fake_openai_client(*args, **kwargs):
    """模拟 OpenAI 兼容客户端，用于 LlamaIndex OpenAIEmbedding / OpenAI LLM。"""
    client = MagicMock()

    def _fake_embeddings_create(input, model, **kwargs):
        if isinstance(input, str):
            input = [input]
        embeddings = []
        for text in input:
            vec = _fake_encode([text])[0].tolist()
            embeddings.append(MagicMock(embedding=vec))
        return MagicMock(data=embeddings)

    def _fake_chat_completions_create(*args, **kwargs):
        messages = kwargs.get("messages", [])
        stream = kwargs.get("stream", False)
        content = "宿舍门禁时间为晚上十一点。晚归需向辅导员报备。"
        for msg in messages:
            if msg.get("role") == "user":
                user_text = str(msg.get("content", ""))
                if "校训" in user_text or "河海大学" in user_text:
                    content = (
                        "河海大学的校训是：艰苦朴素、实事求是、严格要求、勇于探索。"
                    )
                break
        if stream:

            def _gen():
                for ch in content:
                    delta = MagicMock(content=ch, role="assistant")
                    yield MagicMock(choices=[MagicMock(delta=delta)])

            return _gen()
        return MagicMock(choices=[MagicMock(message=MagicMock(content=content))])

    client.embeddings.create = _fake_embeddings_create
    client.chat.completions.create = _fake_chat_completions_create
    return client


_openai_patch = patch("openai.OpenAI", _fake_openai_client)
_openai_patch.start()

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.captcha import captcha_store  # noqa: E402
from app.hhu_reader import HHUMarkdownReader  # noqa: E402
from app.document_files import archive_knowledge_source, resolve_document_path  # noqa: E402
from app.main import app  # noqa: E402
from app.rag import extract_text  # noqa: E402
from app.rag_engine_v2 import HHURAGEngine  # noqa: E402
from app.web_documents import (  # noqa: E402
    WebDocumentError,
    generate_web_document,
    normalize_http_url,
)


def setup_function() -> None:
    if settings.database_path.exists():
        settings.database_path.unlink()
    storage_dir = settings.data_dir / "llama_index_storage"
    if storage_dir.exists():
        import shutil

        shutil.rmtree(storage_dir)
    HHURAGEngine._instance = None
    cache.clear()


def teardown_module(module) -> None:
    _openai_patch.stop()
    import shutil

    shutil.rmtree(TEST_ROOT, ignore_errors=True)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login_payload(email: str, password: str, captcha_code: str | None = None) -> dict[str, str]:
    challenge = captcha_store.issue()
    return {
        "email": email,
        "password": password,
        "captcha_id": challenge.captcha_id,
        "captcha_code": captcha_code if captcha_code is not None else challenge.code,
    }


def test_directory_reader_skips_repository_guides(tmp_path: Path) -> None:
    valid_text = "Campus service knowledge content. " * 4
    (tmp_path / "README.md").write_text(valid_text, encoding="utf-8")
    (tmp_path / "INDEX.md").write_text(valid_text, encoding="utf-8")
    (tmp_path / "service.md").write_text(valid_text, encoding="utf-8")

    documents = HHUMarkdownReader().load_data_from_directory(tmp_path)

    assert len(documents) == 1
    assert documents[0].metadata["file_name"] == "service.md"


def test_directory_document_source_can_be_previewed_and_archived() -> None:
    source = settings.knowledge_base_dir / "demo" / "preview-source.md"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text("目录导入文档的原始内容。", encoding="utf-8")

    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    document = connection.execute(
        "SELECT ? AS stored_name, ? AS filename, ? AS original_path",
        ("missing-preview-source.md", source.name, "source/page.htm"),
    ).fetchone()

    assert resolve_document_path(document) == source
    archived = archive_knowledge_source(source, "preview-source.md")
    assert archived == settings.upload_dir / "preview-source.md"
    assert archived.read_text(encoding="utf-8") == "目录导入文档的原始内容。"


def test_legacy_doc_uses_antiword() -> None:
    result = MagicMock(stdout="旧版 Word 文档内容".encode("utf-8"))
    with (
        patch("app.rag.shutil.which", return_value="antiword"),
        patch("app.rag.subprocess.run", return_value=result) as run,
    ):
        assert extract_text(b"legacy-doc", "guide.doc") == "旧版 Word 文档内容"
    assert run.call_args.args[0][0] == "antiword"


def wait_for_document(
    client: TestClient, token: str, document_id: int, timeout: float = 10
) -> dict:
    """轮询异步处理状态，直到 READY/ERROR。"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        response = client.get(
            "/api/documents?size=100", headers=auth_header(token)
        )
        assert response.status_code == 200
        document = next(
            (
                item
                for item in response.json()["records"]
                if item["id"] == document_id
            ),
            None,
        )
        if document and document["status"] in {"READY", "ERROR"}:
            return document
        time.sleep(0.05)
    raise AssertionError(f"文档 {document_id} 在 {timeout}s 内未完成处理")


def _decode_sse_answer(text: str) -> str:
    """从 SSE 响应体中拼接出 AI 回答文本。"""
    parts = []
    for line in text.splitlines():
        if line.startswith("data: ") and '"text"' in line:
            try:
                parts.append(json.loads(line[len("data: ") :]).get("text", ""))
            except json.JSONDecodeError:
                continue
    return "".join(parts)


def _decode_sse_meta(text: str) -> dict:
    for line in text.splitlines():
        if line.startswith("data: ") and '"sources"' in line:
            return json.loads(line[len("data: ") :])
    return {}


def test_ai_web_generation_uses_web_extractor() -> None:
    markdown = "<!-- SOURCE_TITLE: 校园通知首页 -->\n# 校园服务通知\n\n## 内容概述\n\n这是网页正文。\n\n## 关键事项\n\n- 按通知办理。"
    chunk = MagicMock(
        choices=[MagicMock(delta=MagicMock(content=markdown), finish_reason="length")]
    )
    client = MagicMock()
    client.chat.completions.create.return_value = iter([chunk])

    with patch("app.web_documents._ai_client", return_value=client):
        result = generate_web_document("HTTPS://Example.COM/news?id=1#content")

    request = client.chat.completions.create.call_args.kwargs
    assert request["stream"] is True
    assert request["extra_body"]["enable_search"] is True
    assert request["extra_body"]["enable_thinking"] is True
    assert request["extra_body"]["search_options"]["search_strategy"] == "agent_max"
    assert result["source_url"] == "https://example.com/news?id=1"
    assert result["title"] == "校园服务通知"
    assert result["source_title"] == "校园通知首页"
    assert result["truncated"] is True
    assert "SOURCE_TITLE" not in result["markdown"]
    assert "https://example.com/news?id=1" in result["markdown"]

    failed_chunk = MagicMock(
        choices=[
            MagicMock(
                delta=MagicMock(content="WEB_FETCH_FAILED: 页面需要登录"),
                finish_reason="stop",
            )
        ]
    )
    client.chat.completions.create.return_value = iter([failed_chunk])
    with patch("app.web_documents._ai_client", return_value=client):
        try:
            generate_web_document("https://example.com/private")
        except WebDocumentError as exc:
            assert "页面需要登录" in str(exc)
        else:
            raise AssertionError("AI 抓取失败未转换为用户可读错误")

    for invalid in (
        "file:///etc/passwd",
        "https://user:secret@example.com/",
        "http://example.com:8080/",
        "http://127.0.0.1/",
        "http://192.168.1.20/",
        "http://localhost/",
    ):
        try:
            normalize_http_url(invalid)
        except WebDocumentError:
            pass
        else:
            raise AssertionError(f"危险网址未被拒绝：{invalid}")


def test_web_document_generate_export_and_role_based_submit() -> None:
    generated = {
        "title": "图书馆开放安排",
        "markdown": (
            "# 图书馆开放安排\n\n## 内容概述\n\n本页介绍图书馆开放时间。\n\n"
            "## 关键事项\n\n- 工作日开放。\n\n## 来源\n\n- https://example.com/library"
        ),
        "source_url": "https://example.com/library",
        "source_title": "图书馆开放安排",
        "fetched_at": "2026-07-18T10:00:00+08:00",
        "truncated": False,
    }
    body = {
        "title": generated["title"],
        "markdown": generated["markdown"],
        "source_url": generated["source_url"],
    }

    with TestClient(app) as client:
        admin_login = client.post(
            "/api/auth/login",
            json=login_payload("admin@campus.example", "admin123"),
        )
        admin_token = admin_login.json()["token"]
        student = client.post(
            "/api/auth/register",
            json={"name": "网页采集用户", "email": "web@example.com", "password": "123456"},
        )
        student_token = student.json()["token"]

        assert client.post("/api/web-documents/generate", json={"url": body["source_url"]}).status_code == 401
        with patch("app.main.generate_web_document", return_value=generated):
            response = client.post(
                "/api/web-documents/generate",
                headers=auth_header(student_token),
                json={"url": body["source_url"]},
            )
        assert response.status_code == 200
        assert response.json()["markdown"].startswith("# 图书馆开放安排")

        with patch("app.main.generate_web_document", side_effect=WebDocumentError("AI 无法读取该网页")):
            failed = client.post(
                "/api/web-documents/generate",
                headers=auth_header(student_token),
                json={"url": body["source_url"]},
            )
        assert failed.status_code == 422
        assert failed.json()["detail"] == "AI 无法读取该网页"

        exported = client.post(
            "/api/web-documents/export",
            headers=auth_header(student_token),
            json=body,
        )
        assert exported.status_code == 200
        word = DocxDocument(BytesIO(exported.content))
        word_text = "\n".join(paragraph.text for paragraph in word.paragraphs)
        assert "图书馆开放安排" in word_text
        assert body["source_url"] in word_text

        pending = client.post(
            "/api/web-documents/submit",
            headers=auth_header(student_token),
            json=body,
        )
        assert pending.status_code == 201
        pending_document = pending.json()
        assert pending_document["review_status"] == "PENDING"
        assert pending_document["processing_stage"] == "AWAITING_REVIEW"
        assert pending_document["category"] == "网页采集"
        assert pending_document["source_url"] == body["source_url"]

        approved = client.post(
            "/api/web-documents/submit",
            headers=auth_header(admin_token),
            json={**body, "title": "管理员网页采集文档"},
        )
        assert approved.status_code == 201
        assert approved.json()["review_status"] == "APPROVED"
        assert approved.json()["processing_stage"] == "QUEUED"
        ready = wait_for_document(client, admin_token, approved.json()["id"])
        assert ready["status"] == "READY"
        assert ready["source_url"] == body["source_url"]


def test_full_rag_flow() -> None:
    with TestClient(app) as client:
        captcha = client.get("/api/auth/captcha")
        assert captcha.status_code == 200
        assert len(captcha.json()["captcha_id"]) == 32
        assert captcha.json()["image"].startswith("data:image/png;base64,")

        login = client.post(
            "/api/auth/login",
            json=login_payload("admin@campus.example", "admin123"),
        )
        assert login.status_code == 200
        admin_token = login.json()["token"]

        upload = client.post(
            "/api/documents",
            headers=auth_header(admin_token),
            data={"title": "宿舍管理规定"},
            files={
                "file": (
                    "dorm.md",
                    "宿舍门禁时间为晚上十一点。晚归需向辅导员报备。",
                    "text/markdown",
                )
            },
        )
        assert upload.status_code == 201
        assert upload.json()["status"] in {"PENDING", "PROCESSING", "READY"}
        uploaded = wait_for_document(client, admin_token, upload.json()["id"])
        assert uploaded["status"] == "READY"
        assert uploaded["chunk_count"] > 0

        reprocessed = client.post(
            f"/api/documents/{upload.json()['id']}/reprocess",
            headers=auth_header(admin_token),
        )
        assert reprocessed.status_code == 202
        assert reprocessed.json()["status"] in {"PENDING", "PROCESSING"}
        assert (
            wait_for_document(client, admin_token, upload.json()["id"])["status"]
            == "READY"
        )

        first_guest = client.post("/api/auth/guest")
        second_guest = client.post("/api/auth/guest")
        assert first_guest.status_code == 200
        assert second_guest.status_code == 200
        second_guest_token = second_guest.json()["token"]
        assert first_guest.json()["user"]["id"] != second_guest.json()["user"]["id"]
        assert (
            first_guest.json()["user"]["email"] != second_guest.json()["user"]["email"]
        )

        register = client.post(
            "/api/auth/register",
            json={
                "name": "测试学生",
                "email": "student@example.com",
                "password": "123456",
            },
        )
        assert register.status_code == 201
        student_token = register.json()["token"]

        duplicate_register = client.post(
            "/api/auth/register",
            json={
                "name": "重复注册学生",
                "email": "student@example.com",
                "password": "123456",
            },
        )
        assert duplicate_register.status_code == 409
        bad_login = client.post(
            "/api/auth/login",
            json=login_payload("student@example.com", "wrong-password"),
        )
        assert bad_login.status_code == 401

        bad_captcha = login_payload("student@example.com", "123456", "WRNG")
        captcha_failure = client.post("/api/auth/login", json=bad_captcha)
        assert captcha_failure.status_code == 400
        assert "验证码" in captcha_failure.json()["detail"]
        assert client.post("/api/auth/login", json=bad_captcha).status_code == 400

        assert client.get("/api/documents").status_code == 401
        invalid_status = client.get(
            "/api/documents?status=UNKNOWN", headers=auth_header(student_token)
        )
        assert invalid_status.status_code == 400
        invalid_format = client.post(
            "/api/documents",
            headers=auth_header(student_token),
            data={"title": "错误格式"},
            files={"file": ("danger.exe", b"not allowed", "application/octet-stream")},
        )
        assert invalid_format.status_code == 400
        empty_file = client.post(
            "/api/documents",
            headers=auth_header(student_token),
            data={"title": "空白文档"},
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert empty_file.status_code == 400
        original_upload_limit = settings.max_upload_bytes
        object.__setattr__(settings, "max_upload_bytes", 8)
        try:
            oversized_file = client.post(
                "/api/documents",
                headers=auth_header(student_token),
                data={"title": "超限文件"},
                files={"file": ("too-large.txt", b"123456789", "text/plain")},
            )
        finally:
            object.__setattr__(settings, "max_upload_bytes", original_upload_limit)
        assert oversized_file.status_code == 413

        visible = client.get("/api/documents", headers=auth_header(student_token))
        assert visible.status_code == 200
        assert visible.json()["total"] >= 1
        assert visible.json()["page"] == 1
        assert "stored_name" not in visible.json()["records"][0]
        assert "original_path" not in visible.json()["records"][0]

        student_upload = client.post(
            "/api/documents",
            headers=auth_header(student_token),
            data={"title": "图书馆开放时间"},
            files={
                "file": (
                    "library.txt",
                    "图书馆工作日开放时间为早上八点到晚上十点。",
                    "text/plain",
                )
            },
        )
        assert student_upload.status_code == 201
        student_document_id = student_upload.json()["id"]
        assert student_upload.json()["review_status"] == "PENDING"
        assert student_upload.json()["processing_stage"] == "AWAITING_REVIEW"
        assert student_upload.json()["chunk_count"] == 0

        other_user_documents = client.get(
            "/api/documents?size=100",
            headers=auth_header(second_guest_token),
        )
        assert other_user_documents.status_code == 200
        assert student_document_id not in {
            item["id"] for item in other_user_documents.json()["records"]
        }
        assert client.get(
            f"/api/documents/{student_document_id}/preview",
            headers=auth_header(second_guest_token),
        ).status_code == 403
        assert client.get(
            f"/api/documents/{student_document_id}/download",
            headers=auth_header(second_guest_token),
        ).status_code == 403

        preview = client.get(
            f"/api/documents/{student_document_id}/preview",
            headers=auth_header(student_token),
        )
        assert preview.status_code == 200
        assert preview.json()["kind"] == "text"
        assert "图书馆工作日开放时间" in preview.json()["content"]

        download = client.get(
            f"/api/documents/{student_document_id}/download",
            headers=auth_header(student_token),
        )
        assert download.status_code == 200
        assert download.content == "图书馆工作日开放时间为早上八点到晚上十点。".encode()
        assert "attachment" in download.headers["content-disposition"]

        assert client.delete(
            f"/api/documents/{student_document_id}",
            headers=auth_header(student_token),
        ).status_code == 403
        assert client.post(
            f"/api/documents/{student_document_id}/reprocess",
            headers=auth_header(student_token),
        ).status_code == 403
        assert client.patch(
            f"/api/documents/{student_document_id}",
            headers=auth_header(student_token),
            json={"title": "学生不能改名"},
        ).status_code == 403

        pending_review = client.get(
            "/api/documents?review_status=PENDING",
            headers=auth_header(admin_token),
        )
        assert pending_review.status_code == 200
        assert student_document_id in {
            item["id"] for item in pending_review.json()["records"]
        }
        approved = client.post(
            f"/api/documents/{student_document_id}/review",
            headers=auth_header(admin_token),
            json={"decision": "APPROVED", "note": "内容有效"},
        )
        assert approved.status_code == 202
        assert approved.json()["review_status"] == "APPROVED"
        assert wait_for_document(client, student_token, student_document_id)["status"] == "READY"

        rejected_upload = client.post(
            "/api/documents",
            headers=auth_header(student_token),
            data={"title": "无效投稿"},
            files={"file": ("rejected.txt", "不应进入检索库的测试内容。", "text/plain")},
        )
        assert rejected_upload.status_code == 201
        rejected_id = rejected_upload.json()["id"]
        rejected = client.post(
            f"/api/documents/{rejected_id}/review",
            headers=auth_header(admin_token),
            json={"decision": "REJECTED", "note": "内容不符合知识库要求"},
        )
        assert rejected.status_code == 202
        assert rejected.json()["review_status"] == "REJECTED"
        assert rejected.json()["processing_stage"] == "REVIEW_REJECTED"
        own_documents = client.get(
            "/api/documents?review_status=REJECTED",
            headers=auth_header(student_token),
        )
        assert rejected_id in {item["id"] for item in own_documents.json()["records"]}
        rejected_search = client.post(
            "/api/search",
            headers=auth_header(student_token),
            json={"question": "不应进入检索库的测试内容", "top_k": 10},
        )
        assert "无效投稿" not in {
            result["title"] for result in rejected_search.json()["results"]
        }
        assert client.delete(
            f"/api/documents/{rejected_id}",
            headers=auth_header(admin_token),
        ).status_code == 204

        with patch(
            "app.rag_engine_v2.extract_text",
            return_value="旧版 Word 办事指南：学生可以在线申请证明材料。",
        ):
            legacy_upload = client.post(
                "/api/documents",
                headers=auth_header(student_token),
                data={"title": "旧版 Word 办事指南"},
                files={"file": ("legacy.doc", b"fake-doc-binary", "application/msword")},
            )
            assert legacy_upload.status_code == 201
            legacy_id = legacy_upload.json()["id"]
            assert client.post(
                f"/api/documents/{legacy_id}/review",
                headers=auth_header(admin_token),
                json={"decision": "APPROVED"},
            ).status_code == 202
            assert wait_for_document(client, student_token, legacy_id)["status"] == "READY"

            batch_upload = client.post(
                "/api/documents",
                headers=auth_header(student_token),
                data={"title": "批量处理测试"},
                files={"file": ("batch.txt", "批量处理文档内容。", "text/plain")},
            )
            assert batch_upload.status_code == 201
            batch_id = batch_upload.json()["id"]
            assert client.post(
                f"/api/documents/{batch_id}/review",
                headers=auth_header(admin_token),
                json={"decision": "APPROVED"},
            ).status_code == 202
            assert wait_for_document(client, student_token, batch_id)["status"] == "READY"

            forbidden_batch_reprocess = client.post(
                "/api/documents/batch/reprocess",
                headers=auth_header(student_token),
                json={"ids": [legacy_id, batch_id]},
            )
            assert forbidden_batch_reprocess.status_code == 403
            batch_reprocess = client.post(
                "/api/documents/batch/reprocess",
                headers=auth_header(admin_token),
                json={"ids": [legacy_id, batch_id]},
            )
            assert batch_reprocess.status_code == 202
            assert batch_reprocess.json()["count"] == 2
            assert wait_for_document(client, student_token, legacy_id)["status"] == "READY"
            assert wait_for_document(client, student_token, batch_id)["status"] == "READY"

        forbidden_batch_delete = client.post(
            "/api/documents/batch/delete",
            headers=auth_header(student_token),
            json={"ids": [legacy_id, batch_id]},
        )
        assert forbidden_batch_delete.status_code == 403
        batch_delete = client.post(
            "/api/documents/batch/delete",
            headers=auth_header(admin_token),
            json={"ids": [legacy_id, batch_id]},
        )
        assert batch_delete.status_code == 200
        assert batch_delete.json()["count"] == 2
        remaining = client.get(
            "/api/documents?size=100", headers=auth_header(student_token)
        ).json()["records"]
        assert legacy_id not in {item["id"] for item in remaining}
        assert batch_id not in {item["id"] for item in remaining}

        renamed = client.patch(
            f"/api/documents/{student_document_id}",
            headers=auth_header(admin_token),
            json={"title": "图书馆开放安排"},
        )
        assert renamed.status_code == 200
        assert wait_for_document(client, student_token, student_document_id)["title"] == "图书馆开放安排"

        search = client.post(
            "/api/search",
            headers=auth_header(student_token),
            json={"question": "图书馆几点开放？", "top_k": 3},
        )
        assert search.status_code == 200
        assert search.json()["results"]
        assert any(
            result["title"] == "图书馆开放安排"
            for result in search.json()["results"]
        )

        removed = client.delete(
            f"/api/documents/{student_document_id}",
            headers=auth_header(admin_token),
        )
        assert removed.status_code == 204
        after_delete_search = client.post(
            "/api/search",
            headers=auth_header(student_token),
            json={"question": "图书馆几点开放？", "top_k": 10},
        )
        assert all(
            result["title"] != "图书馆开放安排"
            for result in after_delete_search.json()["results"]
        )

        chat = client.post(
            "/api/chat/stream",
            headers=auth_header(student_token),
            json={"question": "宿舍几点关门？"},
        )
        assert chat.status_code == 200
        answer = _decode_sse_answer(chat.text)
        assert "宿舍门禁时间" in answer
        meta = _decode_sse_meta(chat.text)
        assert isinstance(meta.get("conversation_id"), int)
        assert meta.get("sources")
        assert any(source["title"] == "宿舍管理规定" for source in meta["sources"])
        assert meta["confidence"]["level"] in {"HIGH", "MEDIUM", "LOW"}
        assert 0 <= meta["confidence"]["score"] <= 100
        assert len(meta["follow_up_questions"]) >= 2

        history = client.get("/api/conversations", headers=auth_header(student_token))
        assert history.status_code == 200
        assert len(history.json()) == 1
        assert history.json()[0]["title"] == "宿舍几点关门？"
        assert history.json()[0]["message_count"] == 2

        searched_by_question = client.get(
            "/api/conversations?keyword=宿舍几点",
            headers=auth_header(student_token),
        )
        assert [item["id"] for item in searched_by_question.json()] == [
            history.json()[0]["id"]
        ]
        searched_by_answer = client.get(
            "/api/conversations?keyword=辅导员报备",
            headers=auth_header(student_token),
        )
        assert len(searched_by_answer.json()) == 1
        assert (
            client.get(
                "/api/conversations?keyword=不存在的历史关键词",
                headers=auth_header(student_token),
            ).json()
            == []
        )

        conversation_id = history.json()[0]["id"]
        assert meta["conversation_id"] == conversation_id
        detail = client.get(
            f"/api/conversations/{conversation_id}",
            headers=auth_header(student_token),
        )
        assert len(detail.json()["messages"]) == 2

        sync_chat = client.post(
            "/api/chat",
            headers=auth_header(student_token),
            json={
                "question": "晚归需要怎么处理？",
                "conversation_id": conversation_id,
            },
        )
        assert sync_chat.status_code == 200
        assert sync_chat.json()["conversation_id"] == conversation_id
        assert sync_chat.json()["answer"]
        assert isinstance(sync_chat.json()["sources"], list)
        assert sync_chat.json()["confidence"]["label"]
        assert sync_chat.json()["follow_up_questions"]

        renamed = client.patch(
            f"/api/conversations/{conversation_id}",
            headers=auth_header(student_token),
            json={"title": "宿舍管理问答"},
        )
        assert renamed.status_code == 200
        assert renamed.json()["title"] == "宿舍管理问答"
        detail = client.get(
            f"/api/conversations/{conversation_id}",
            headers=auth_header(student_token),
        )
        assert len(detail.json()["messages"]) == 4
        assert detail.json()["title"] == "宿舍管理问答"
        assistant_messages = [
            message for message in detail.json()["messages"]
            if message["role"] == "ASSISTANT"
        ]
        assert all(message["confidence"]["label"] for message in assistant_messages)
        assert all(message["follow_up_questions"] for message in assistant_messages)

        second_chat = client.post(
            "/api/chat",
            headers=auth_header(student_token),
            json={"question": "河海大学的校训是什么？"},
        )
        assert second_chat.status_code == 200
        second_conversation_id = second_chat.json()["conversation_id"]
        sorted_history = client.get(
            "/api/conversations", headers=auth_header(student_token)
        ).json()
        assert [item["id"] for item in sorted_history[:2]] == [
            second_conversation_id,
            conversation_id,
        ]
        assert sorted_history[0]["title"] == "河海大学的校训是什么？"
        assert client.delete(
            f"/api/conversations/{second_conversation_id}",
            headers=auth_header(student_token),
        ).status_code == 204

        deleted = client.delete(
            f"/api/conversations/{conversation_id}",
            headers=auth_header(student_token),
        )
        assert deleted.status_code == 204

        # 普通用户可读取共享知识，但不能修改、重处理或删除文档。
        shared_update = client.patch(
            f"/api/documents/{upload.json()['id']}",
            headers=auth_header(student_token),
            json={"title": "宿舍管理规定（共享修订）"},
        )
        assert shared_update.status_code == 403
        shared_reprocess = client.post(
            f"/api/documents/{upload.json()['id']}/reprocess",
            headers=auth_header(student_token),
        )
        assert shared_reprocess.status_code == 403
        shared_delete = client.delete(
            f"/api/documents/{upload.json()['id']}",
            headers=auth_header(student_token),
        )
        assert shared_delete.status_code == 403
        assert client.delete(
            f"/api/documents/{upload.json()['id']}",
            headers=auth_header(admin_token),
        ).status_code == 204


def test_user_crud_and_permissions() -> None:
    """覆盖 Day2 验收：完整 CRUD、登录保护、角色权限和停用即时生效。"""
    with TestClient(app) as client:
        admin_login = client.post(
            "/api/auth/login",
            json=login_payload("admin@campus.example", "admin123"),
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["token"]
        admin_id = admin_login.json()["user"]["id"]

        me = client.get("/api/auth/me", headers=auth_header(admin_token))
        assert me.status_code == 200
        assert me.json()["email"] == "admin@campus.example"
        assert "password_hash" not in me.json()

        assert client.get("/api/users").status_code == 401

        student = client.post(
            "/api/auth/register",
            json={
                "name": "普通学生",
                "email": "ordinary@example.com",
                "password": "123456",
            },
        )
        assert student.status_code == 201
        student_token = student.json()["token"]
        assert (
            client.get("/api/users", headers=auth_header(student_token)).status_code
            == 403
        )
        assert (
            client.post(
                "/api/users",
                headers=auth_header(student_token),
                json={
                    "name": "越权新增",
                    "email": "forbidden@example.com",
                    "password": "123456",
                    "role": "ADMIN",
                },
            ).status_code
            == 403
        )

        created = client.post(
            "/api/users",
            headers=auth_header(admin_token),
            json={
                "name": "待管理用户",
                "email": "managed@example.com",
                "password": "123456",
                "role": "STUDENT",
            },
        )
        assert created.status_code == 201
        managed_id = created.json()["id"]

        duplicate = client.post(
            "/api/users",
            headers=auth_header(admin_token),
            json={
                "name": "重复邮箱",
                "email": "managed@example.com",
                "password": "123456",
                "role": "STUDENT",
            },
        )
        assert duplicate.status_code == 409

        users = client.get("/api/users", headers=auth_header(admin_token))
        assert users.status_code == 200
        assert users.json()["total"] == 3
        assert any(user["id"] == managed_id for user in users.json()["records"])
        assert all(
            "password_hash" not in user for user in users.json()["records"]
        )

        paged = client.get(
            "/api/users?page=2&size=1", headers=auth_header(admin_token)
        )
        assert paged.status_code == 200
        assert paged.json()["page"] == 2
        assert paged.json()["size"] == 1
        assert len(paged.json()["records"]) == 1

        searched = client.get(
            "/api/users?keyword=managed%40example.com&role=STUDENT&is_active=true",
            headers=auth_header(admin_token),
        )
        assert searched.status_code == 200
        assert searched.json()["total"] == 1
        assert searched.json()["records"][0]["id"] == managed_id

        cannot_demote_self = client.patch(
            f"/api/users/{admin_id}",
            headers=auth_header(admin_token),
            json={"role": "STUDENT"},
        )
        assert cannot_demote_self.status_code == 400

        updated = client.patch(
            f"/api/users/{managed_id}",
            headers=auth_header(admin_token),
            json={
                "name": "已编辑用户",
                "email": "edited@example.com",
                "role": "ADMIN",
            },
        )
        assert updated.status_code == 200
        assert updated.json()["name"] == "已编辑用户"
        assert updated.json()["email"] == "edited@example.com"
        assert updated.json()["role"] == "ADMIN"

        managed_login = client.post(
            "/api/auth/login",
            json=login_payload("edited@example.com", "123456"),
        )
        assert managed_login.status_code == 200
        managed_token = managed_login.json()["token"]

        cannot_delete_self = client.delete(
            f"/api/users/{admin_id}", headers=auth_header(admin_token)
        )
        assert cannot_delete_self.status_code == 400

        deleted = client.delete(
            f"/api/users/{managed_id}", headers=auth_header(admin_token)
        )
        assert deleted.status_code == 204
        assert (
            client.get("/api/auth/me", headers=auth_header(managed_token)).status_code
            == 401
        )
        assert (
            client.post(
                "/api/auth/login",
                json=login_payload("edited@example.com", "123456"),
            ).status_code
            == 403
        )
