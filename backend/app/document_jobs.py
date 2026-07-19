"""知识库文档的后台处理队列。

上传接口只负责落盘和建记录；耗时的解析、切分、Embedding 与 FAISS 入库
在线程池中执行。每个后台任务都使用独立 SQLite 连接，避免跨线程复用请求连接。
"""

from concurrent.futures import Future, ThreadPoolExecutor
from contextlib import closing
from pathlib import Path
import threading

from .database import connect, utc_now
from .document_files import resolve_document_path
from .rag_engine_v2 import rag_engine


_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="document-indexer")
_jobs: dict[int, Future[None]] = {}
_jobs_lock = threading.Lock()


def _set_state(
    document_id: int,
    *,
    status: str,
    stage: str,
    error: str | None = None,
    chunk_count: int | None = None,
) -> None:
    assignments = ["status = ?", "processing_stage = ?", "error = ?", "updated_at = ?"]
    values: list[object] = [status, stage, error, utc_now()]
    if chunk_count is not None:
        assignments.append("chunk_count = ?")
        values.append(chunk_count)
    values.append(document_id)
    with closing(connect()) as db:
        db.execute(
            f"UPDATE documents SET {', '.join(assignments)} WHERE id = ?", values
        )
        db.commit()


def _process_document(document_id: int) -> None:
    try:
        with closing(connect()) as db:
            document = db.execute(
                "SELECT * FROM documents WHERE id = ?", (document_id,)
            ).fetchone()
        if not document:
            return
        if document["review_status"] != "APPROVED":
            return

        path = resolve_document_path(document)
        if path is None:
            raise FileNotFoundError("原始文件不存在")

        _set_state(document_id, status="PROCESSING", stage="EXTRACTING")
        # LlamaIndex 在一次调用内完成文本解析、切分、批量 Embedding 和入库。
        _set_state(document_id, status="PROCESSING", stage="INDEXING")
        chunk_count = rag_engine.add_document(
            file_path=path,
            document_id=document_id,
            title=document["title"],
            category=document["category"] or "其他",
            source_url=document["source_url"] or "",
        )
        if chunk_count <= 0:
            raise ValueError("文档没有可索引的有效文本")

        with closing(connect()) as db:
            still_exists = db.execute(
                "SELECT 1 FROM documents WHERE id = ?", (document_id,)
            ).fetchone()
        if not still_exists:
            # 删除与处理并发时，确保不会留下孤儿向量。
            rag_engine.delete_document(document_id)
            return

        _set_state(
            document_id,
            status="READY",
            stage="DONE",
            chunk_count=chunk_count,
        )
    except Exception as exc:
        _set_state(
            document_id,
            status="ERROR",
            stage="FAILED",
            error=str(exc)[:1000],
            chunk_count=0,
        )


def _discard_job(document_id: int, future: Future[None]) -> None:
    with _jobs_lock:
        if _jobs.get(document_id) is future:
            _jobs.pop(document_id, None)


def schedule_document(document_id: int) -> bool:
    """提交后台处理；同一文档已有任务时返回 False，防止重复提交。"""
    with _jobs_lock:
        running = _jobs.get(document_id)
        if running and not running.done():
            return False
        future = _executor.submit(_process_document, document_id)
        _jobs[document_id] = future
        future.add_done_callback(lambda done: _discard_job(document_id, done))
        return True


def is_processing(document_id: int) -> bool:
    with _jobs_lock:
        job = _jobs.get(document_id)
        return bool(job and not job.done())
