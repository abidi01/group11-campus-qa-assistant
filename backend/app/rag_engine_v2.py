"""RAG engine backed by LlamaIndex.

Components:
- VectorStoreIndex + FaissVectorStore
- DashScopeEmbedding (text-embedding-v3)
- DashScope LLM (qwen-turbo)
- CondensePlusContextChatEngine for multi-turn chat
- HHUMarkdownReader for the knowledge-base corpus
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import closing
from pathlib import Path
from typing import Any
import random
import threading
import time

import faiss
from llama_index.core import Settings, StorageContext, VectorStoreIndex
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import Document, MetadataMode
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.vector_stores.faiss import FaissVectorStore

from .config import settings
from .database import connect, utc_now
from .document_files import archive_knowledge_source
from .hhu_reader import HHUMarkdownReader
from .rag import extract_text


class OpenAICompatibleLLM(OpenAI):
    """OpenAI 兼容接口的 LLM 封装。

    设计动机：llama_index 的 OpenAI 客户端对 model 字段有白名单校验，
    直接传 `qwen-turbo` 会被拒绝。继承并重写 `_get_model_name` 返回一个
    通过校验的占位名（如 gpt-3.5-turbo），真实模型名由基类的 model
    参数透传给 OpenAI 兼容端点（DashScope 的 /compatible-mode/v1）。
    """

    def _get_model_name(self) -> str:
        # 仅用于本地 metadata / context_window 计算，不影响实际请求
        return "gpt-3.5-turbo"


HHU_SYSTEM_PROMPT = """你是河海大学校园问答助手，专门回答关于河海大学的各类问题。

【回答要求】
1. 只根据提供的参考资料回答，资料不足时明确说明"根据现有资料，暂未找到相关信息"
2. 使用简洁、专业的中文回答
3. 在回答中引用资料来源，使用 [1]、[2] 等标注
4. 回答末尾可附上"如需了解更多，可访问河海大学官网：www.hhu.edu.cn"
5. 对于招生、录取等时效性问题，建议用户核实最新信息"""


class HHURAGEngine:
    """基于 LlamaIndex 的 RAG 引擎，使用 OpenAI 兼容接口对接百炼/DashScope。

    单例模式（通过 `__new__` + `_initialized` 标志）—— 整个进程共用一份
    FAISS 索引、docstore、_index_lock，否则多个实例会导致状态不一致。
    """

    _instance: HHURAGEngine | None = None

    def __new__(cls) -> "HHURAGEngine":
        """单例入口：第一次调用时创建实例，之后都返回同一个。

        为什么单例：
        - FAISS 索引 + docstore + 嵌入模型都是重量级对象
        - 多个实例意味着多份索引，状态会发散
        - _index_lock 只能在单个引擎内部生效
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """初始化引擎：配置 Settings、建索引锁、加载或重建 FAISS。

        注意：被 `__new__` 保护，重复调用不会重新初始化。
        启动顺序很重要：先 Settings（要拿到 API key），再 lock，最后建索引。
        """
        if getattr(self, "_initialized", False):
            return
        self._initialized = True

        self._configure_settings()
        self._index_lock = threading.RLock()

        self.persist_dir = settings.data_dir / "llama_index_storage"
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self.index = self._load_or_build_index()
        self._ingestion_pipeline = self._build_ingestion_pipeline()

    # ------------------------------------------------------------------
    # 配置
    # ------------------------------------------------------------------
    def _configure_settings(self) -> None:
        """配置 LlamaIndex 全局 Settings（嵌入模型、LLM、切分器、上下文窗口）。

        关键设计：
        - 缺 DASHSCOPE_API_KEY 立刻抛 RuntimeError，避免运行时才暴露问题
        - 用 OpenAI 兼容接口（base_url 指向 DashScope）绕过域名限制
        - OpenAIEmbedding 的 model 字段是给 LlamaIndex 枚举校验用的"假名"，
          真实模型名通过 model_name=settings.embedding_model 传过去
        - temperature=0.1 偏向确定性回答（教学/校园场景忌讳"自由发挥"）
        - max_tokens=1024 限制单次回答长度，避免一次吐太多
        """
        if not settings.dashscope_api_key:
            raise RuntimeError(
                "DASHSCOPE_API_KEY 未配置；本项目需要联网使用 DashScope Embedding 与 LLM"
            )
        # 统一使用 OpenAI 兼容接口，支持自定义百炼工作空间_HOST
        api_base = settings.llm_base_url
        api_key = settings.dashscope_api_key or settings.llm_api_key
        # OpenAIEmbedding 会校验 model 枚举值，用 model_name 传实际模型名来绕过
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-ada-002",
            model_name=settings.embedding_model,
            api_base=api_base,
            api_key=api_key,
            embed_batch_size=10,
        )
        Settings.llm = OpenAICompatibleLLM(
            model=settings.llm_model,
            api_base=api_base,
            api_key=api_key,
            temperature=0.1,
            max_tokens=1024,
        )
        Settings.node_parser = SentenceSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            paragraph_separator="\n\n",
        )
        Settings.context_window = 8192

    def _build_ingestion_pipeline(self) -> IngestionPipeline:
        """构造 IngestionPipeline：先切块（SentenceSplitter），再嵌入。

        实际走的是 `index.insert()` 隐式调用同样的 transformations，
        这个 pipeline 字段保留主要是为了未来扩展（添加清洗步骤 / 摘要步骤）。
        """
        return IngestionPipeline(
            transformations=[
                SentenceSplitter(
                    chunk_size=settings.chunk_size,
                    chunk_overlap=settings.chunk_overlap,
                    paragraph_separator="\n\n",
                ),
                Settings.embed_model,
            ]
        )

    # ------------------------------------------------------------------
    # 索引加载 / 构建
    # ------------------------------------------------------------------
    def _create_faiss_index(self, dimension: int) -> faiss.Index:
        """创建裸的 FAISS 索引对象。

        用 `IndexFlatIP`（精确内积）而非 IVF/HNSW 的取舍：
        - demo KB 仅 ~2 篇文档，全量 1097 篇，精确检索够用
        - 复杂度 O(n)，n=10^5 仍可秒级返回
        - 真要扩到百万级应该换 `IndexIVFFlat` 或 `IndexHNSWFlat`
        为什么用 IP 而非 L2：text-embedding-v3 默认 L2 归一化，
        内积 = 余弦相似度，对语义检索更合适。
        """
        # FaissVectorStore 内部自行维护 ID 映射，传入裸 IndexFlatIP 即可
        return faiss.IndexFlatIP(dimension)

    def _load_or_build_index(self) -> VectorStoreIndex:
        """加载已有索引，或从头建一个新的。

        处理三种磁盘状态：
        1. docstore + faiss + index_store 都在 → 完整加载（最常见）
        2. 只有 docstore，向量文件缺失 → 降级用 docstore 重建（不会丢数据）
        3. 都不在 → 新建空索引（首次启动）

        加载失败时**不会**自动覆盖 docstore，避免误删历史节点。
        """
        docstore_path = self.persist_dir / "docstore.json"
        faiss_path = self.persist_dir / "faiss.index"
        index_store_path = self.persist_dir / "index_store.json"
        from llama_index.core.storage.docstore import SimpleDocumentStore
        from llama_index.core.storage.index_store import SimpleIndexStore

        # 优先加载已有索引；加载失败时不覆盖已有 docstore，避免数据丢失
        if docstore_path.exists():
            try:
                docstore = SimpleDocumentStore.from_persist_path(str(docstore_path))
                if faiss_path.exists() and index_store_path.exists():
                    index_store = SimpleIndexStore.from_persist_path(
                        str(index_store_path)
                    )
                    faiss_index = faiss.read_index(str(faiss_path))
                    vector_store = FaissVectorStore(faiss_index=faiss_index)
                    storage_context = StorageContext.from_defaults(
                        docstore=docstore,
                        index_store=index_store,
                        vector_store=vector_store,
                    )
                    from llama_index.core import load_index_from_storage

                    index_structs = index_store.index_structs()
                    if len(index_structs) == 1:
                        index = load_index_from_storage(storage_context)
                    else:
                        index = load_index_from_storage(
                            storage_context, index_id=index_structs[0].index_id
                        )
                    print(
                        f"✅ LlamaIndex 索引已加载: {len(index.docstore.docs)} 个节点"
                    )
                    return index
                # 仅有 docstore 时，从 docstore 重建向量索引
                print("⚠️ 向量索引文件缺失，从 docstore 重建")
                return self._build_index_from_docstore(docstore)
            except Exception as exc:
                print(f"⚠️ LlamaIndex 索引加载失败: {exc}")
                raise

        dimension = self._get_embedding_dimension()
        faiss_index = self._create_faiss_index(dimension)
        vector_store = FaissVectorStore(faiss_index=faiss_index)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex(
            nodes=[],
            storage_context=storage_context,
            store_nodes_override=True,
        )
        print(f"✅ 已创建空 LlamaIndex 索引 (维度 {dimension})")
        return index

    def _get_embedding_dimension(self) -> int:
        """获取当前嵌入模型的向量维度（用于初始化 FAISS 索引）。

        两条路径：
        - text-embedding-v3 固定 1024 维（硬编码快速路径，省一次 API 调用）
        - 其他模型 → 调一次真实 API 探测（贵但准确，作为兜底）
        """
        # text-embedding-v3 固定 1024 维
        if settings.embedding_model == "text-embedding-v3":
            return 1024
        # 兜底：用空文本探测一次
        embedding = Settings.embed_model.get_text_embedding("dimension probe")
        return len(embedding)

    def _persist(self, index: VectorStoreIndex | None = None) -> None:
        """把当前索引的 3 部分分别落盘到 `data/llama_index_storage/`。

        三件套：
        - `docstore.json`     ：所有 TextNode（原文 + metadata + 关系边）
        - `index_store.json`  ：index_id → IndexStruct 映射
        - `faiss.index`       ：二进制向量（仅有 ID + 数值）

        必须加锁：FAISS 写入不是线程安全的；不加锁并发写会破坏向量布局。
        """
        with self._index_lock:
            target = index or self.index
            self.persist_dir.mkdir(parents=True, exist_ok=True)
            # 分别持久化 docstore / index_store / faiss index
            target.docstore.persist(
                persist_path=str(self.persist_dir / "docstore.json")
            )
            target.storage_context.index_store.persist(
                persist_path=str(self.persist_dir / "index_store.json")
            )
            faiss.write_index(
                target.storage_context.vector_store._faiss_index,
                str(self.persist_dir / "faiss.index"),
            )

    def save_index(self) -> None:
        """显式持久化索引（供外部事务提交后调用）。"""
        self._persist()

    # ------------------------------------------------------------------
    # 文档管理
    # ------------------------------------------------------------------
    def _is_retryable_network_error(self, exc: Exception) -> bool:
        """判断一个异常是否值得重试（仅限网络类瞬时错误）。

        只重试：ConnectionReset / Timeout / Connection aborted
        不重试：参数错、API key 错、长度超限等永久性错误

        区分原则：网络错误恢复后可继续；业务错误重试 100 次也是同样的错。
        """
        name = type(exc).__name__.lower()
        msg = str(exc).lower()
        return (
            "connection" in name
            or "timeout" in name
            or "connectionreset" in msg
            or "connection aborted" in msg
            or "connection reset" in msg
        )

    def _insert_with_retry(self, doc: Document, max_retries: int = 3) -> None:
        """把一个 Document 插入索引，并对网络错误自动重试。

        退避策略：`2^attempt + random()` 秒（指数退避 + 抖动，避免雪崩）。
        - 业务错误（参数错、API key 错）立即抛出
        - 调用方负责捕获后写 `status='ERROR'` 到数据库

        加锁：FAISS insert 内部会同时操作 docstore 和 faiss，必须互斥。
        """
        for attempt in range(max_retries):
            try:
                with self._index_lock:
                    self.index.insert(doc)
                return
            except Exception as exc:
                if (
                    not self._is_retryable_network_error(exc)
                    or attempt == max_retries - 1
                ):
                    raise
                wait = 2**attempt + random.random()
                print(
                    f"⚠️ 插入文档网络错误（第 {attempt + 1}/{max_retries} 次）: {exc}，{wait:.1f}s 后重试..."
                )
                time.sleep(wait)

    def add_document(
        self,
        file_path: Path | str,
        document_id: int,
        title: str = "",
        category: str = "其他",
        source_url: str = "",
        db: sqlite3.Connection | None = None,
    ) -> int:
        """为单个文档建立/更新索引，返回实际生成的 chunk（节点）数量。

        完整流程：
        1. `_build_document` 解析文件为 LlamaIndex Document（清洗/分块准备）
        2. 空内容（纯导航）直接返回 0
        3. `delete_document(persist=False)` 先删同名旧节点（实现幂等）
        4. `_insert_with_retry` 走分块 + 嵌入 + 插入
        5. `_persist` 落盘
        6. `_count_nodes_by_document_id` 统计实际节点数
        7. 传了 db 就回写 `chunk_count` + `status='READY'` 到 SQLite

        返回值 0 表示文档清洗后无内容（被忽略，不报错）。
        """
        file_path = Path(file_path)
        document = self._build_document(
            file_path=file_path,
            document_id=document_id,
            title=title or file_path.stem,
            category=category,
            source_url=source_url,
        )
        if not document.text.strip():
            return 0

        # 同名/同 ID 文档先删除旧节点
        self.delete_document(document_id, persist=False)

        self._insert_with_retry(document)
        self._persist()

        # 统计实际生成的节点数
        node_count = self._count_nodes_by_document_id(document_id)

        if db is not None:
            db.execute(
                """
                UPDATE documents
                SET chunk_count = ?, status = 'READY', processing_stage = 'DONE',
                    error = NULL, updated_at = ?
                WHERE id = ?
                """,
                (node_count, utc_now(), document_id),
            )
        return node_count

    def _build_document(
        self,
        file_path: Path,
        document_id: int,
        title: str,
        category: str,
        source_url: str,
    ) -> Document:
        """根据文件后缀构造 LlamaIndex `Document` 对象。

        分支：
        - `.md` → `HHUMarkdownReader`（清洗导航词 + 解析 YAML frontmatter）
        - 其它后缀 → `extract_text`（pypdf / python-docx / utf-8 字节流）

        无论走哪条路，最后都注入 6 个核心 metadata：
        `document_id` / `stored_name` / `title` / `category` / `source_url` / `file_path`
        这些 metadata 会一路继承到 chunk，被检索结果 `_format_sources` 用到。
        """
        suffix = file_path.suffix.lower()
        if suffix in {".md"}:
            # Markdown 使用 HHUMarkdownReader 清洗
            docs = HHUMarkdownReader().load_data(file_path)
            if docs:
                doc = docs[0]
                doc.metadata["document_id"] = str(document_id)
                doc.metadata["stored_name"] = file_path.name
                doc.metadata.setdefault("title", title)
                doc.metadata.setdefault(
                    "category", category or doc.metadata.get("category", "其他")
                )
                doc.metadata.setdefault(
                    "source_url", source_url or doc.metadata.get("source_url", "")
                )
                return doc

        data = file_path.read_bytes()
        text = extract_text(data, file_path.name)
        return Document(
            text=text,
            metadata={
                "document_id": str(document_id),
                "title": title,
                "category": category,
                "source_url": source_url,
                "stored_name": file_path.name,
                "file_path": str(file_path),
            },
        )

    def _count_nodes_by_document_id(self, document_id: int) -> int:
        """统计属于某个文档 ID 的 TextNode 数量。

        用 docstore 而非 SQL `chunks` 表统计：
        - 向量的真源是 docstore + FAISS，不是 chunks 表
        - chunks.vector 列在 LlamaIndex 路径下永远是 NULL（见 database.py 迁移说明）
        加锁：避免在遍历过程中 docstore 被其他线程修改。
        """
        target = str(document_id)
        with self._index_lock:
            return sum(
                1
                for node in self.index.docstore.docs.values()
                if node.metadata.get("document_id") == target
            )

    def _build_index_from_docstore(
        self, docstore: Any | None = None
    ) -> VectorStoreIndex:
        """用 docstore 中的节点重建一个全新的 FAISS 索引，返回新索引。

        关键设计：
        - 新建 `SimpleIndexStore`（**不能**复用旧的，否则会累积旧 IndexStruct）
        - 把所有 nodes 一次性传进去 → LlamaIndex 会重新嵌入所有节点
        - 用 `store_nodes_override=True` 强制覆盖

        性能：节点越多越慢。100 节点约 1s，1000 节点约 10s（取决于 embedding API 延迟）。
        这是 `delete_document` 和 `rebuild_index` 都依赖的底层操作。
        """
        from llama_index.core.storage.index_store import SimpleIndexStore

        target_docstore = docstore or self.index.docstore
        nodes = list(target_docstore.docs.values())
        dimension = self._get_embedding_dimension()
        faiss_index = self._create_faiss_index(dimension)
        vector_store = FaissVectorStore(faiss_index=faiss_index)
        # 新建空的 index_store，避免旧的 index_struct 不断累积
        storage_context = StorageContext.from_defaults(
            docstore=target_docstore,
            index_store=SimpleIndexStore(),
            vector_store=vector_store,
        )
        return VectorStoreIndex(
            nodes=nodes,
            storage_context=storage_context,
            store_nodes_override=True,
        )

    def _rebuild_index_from_docstore(self) -> None:
        """根据当前 docstore 重建索引（覆盖 self.index）。

        是 `_build_index_from_docstore` 的便捷包装，不传 docstore 就用 self.index.docstore。
        """
        self.index = self._build_index_from_docstore()

    def delete_document(self, document_id: int, persist: bool = True) -> bool:
        """删除与 document_id 关联的所有节点，返回是否真有节点被删。

        ⚠️ **FAISS IndexFlatIP 不支持单点删除**！这是本函数最大的特殊性。

        实现方式（看似朴素实则被迫）：
        1. 在 docstore 里找出所有 document_id 匹配的 node_id
        2. 从 docstore 中删除这些 node
        3. 调 `_rebuild_index_from_docstore` 用剩余节点重建 FAISS
        4. （可选）`_persist` 落盘

        在小 KB（< 1000 chunk）上代价可接受，每删一个文档就要重新嵌入所有剩余 chunk。
        替代方案（生产推荐）：
        - `IndexHNSWFlat` 支持 `remove_ids`
        - Milvus / Qdrant / Weaviate 等专用向量库
        - 软删除（标记 is_deleted，过滤时跳过）
        """
        return self.delete_documents([document_id], persist=persist)

    def delete_documents(
        self, document_ids: list[int], persist: bool = True
    ) -> bool:
        """批量删除多个文档的节点，只重建一次 FAISS，避免重复 Embedding。"""
        with self._index_lock:
            targets = {str(document_id) for document_id in document_ids}
            node_ids = [
                node_id
                for node_id, node in self.index.docstore.docs.items()
                if node.metadata.get("document_id") in targets
            ]
            if not node_ids:
                return False
            for node_id in node_ids:
                self.index.docstore.delete_document(node_id)
            self._rebuild_index_from_docstore()
            if persist:
                self._persist()
            return True

    def _remove_excluded_directory_documents(
        self, excluded_names: set[str]
    ) -> int:
        """清理曾被误索引的 README/INDEX 元数据文档。"""
        normalized = {name.lower() for name in excluded_names}
        with closing(connect()) as db:
            rows = db.execute(
                "SELECT id, stored_name FROM documents WHERE status = 'READY'"
            ).fetchall()
            stale_ids = [
                int(row["id"])
                for row in rows
                if str(row["stored_name"]).lower() in normalized
            ]
            if not stale_ids:
                return 0
            self.delete_documents(stale_ids)
            placeholders = ",".join("?" for _ in stale_ids)
            db.execute(
                f"DELETE FROM documents WHERE id IN ({placeholders})", stale_ids
            )
            db.commit()
            return len(stale_ids)

    def reprocess_document(
        self,
        file_path: Path | str,
        document_id: int,
        title: str = "",
        category: str = "其他",
        source_url: str = "",
        db: sqlite3.Connection | None = None,
    ) -> int:
        """重新处理文档：保留 document_id，重新走 add_document 流程。

        用于：
        - 嵌入模型升级（如 v3 → v4）后想用新模型重新嵌入
        - chunk_size / overlap 调整后想用新参数重切
        - 人工修正了源文件后想刷新索引

        和"删除再上传"的区别：**document_id 不变** → 引用这个文档的会话历史不会断。
        `persist=False` 在内部 delete_document，避免双重持久化开销。
        """
        self.delete_document(document_id, persist=False)
        return self.add_document(
            file_path=file_path,
            document_id=document_id,
            title=title,
            category=category,
            source_url=source_url,
            db=db,
        )

    def rebuild_index(self) -> None:
        """全量重建索引：清空 FAISS，从 SQLite 重新加载所有 READY 文档。

        适用场景：
        - FAISS 文件损坏 / 与 docstore 不一致
        - 切换嵌入模型后
        - 大规模清洗数据后想重置

        注意：每个文档都会**重新调 embedding API**（1097 篇就会烧掉一批 token）。
        ERROR 状态的文档会被跳过（status != 'READY'）。
        """
        with self._index_lock:
            dimension = self._get_embedding_dimension()
            faiss_index = self._create_faiss_index(dimension)
            vector_store = FaissVectorStore(faiss_index=faiss_index)
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            self.index = VectorStoreIndex(
                nodes=[],
                storage_context=storage_context,
                store_nodes_override=True,
            )
            with closing(connect()) as db:
                rows = db.execute(
                    "SELECT id, stored_name, title, category, source_url FROM documents WHERE status = 'READY'"
                ).fetchall()
                for row in rows:
                    path = settings.upload_dir / row["stored_name"]
                    if not path.exists():
                        continue
                    self.add_document(
                        file_path=path,
                        document_id=row["id"],
                        title=row["title"] or "",
                        category=row["category"] or "其他",
                        source_url=row["source_url"] or "",
                    )
            self._persist()

    # ------------------------------------------------------------------
    # 知识库加载
    # ------------------------------------------------------------------
    def load_knowledge_base(
        self, directory: Path | str | None = None, uploaded_by: int = 1
    ) -> int:
        """从 knowledge-base 目录灌库（CLI 路径），返回成功新增的文档数。

        流程：
        1. `HHUMarkdownReader` 读所有 `.md`
        2. 扫描 docstore 收集已索引的文件名（去重）
        3. 批大小 20，每批 commit 一次（防崩溃丢太多）
        4. 网络错误自动重试，业务错误 `print` 后跳过
        5. 同时写 SQLite `documents` 表（status='READY'）

        与 `add_document` 的区别：
        - `load_knowledge_base` 走文件目录，CLI 触发，乐观事务
        - `add_document` 走单文件 API，HTTP 触发，悲观事务
        """
        directory = Path(directory or settings.knowledge_base_dir)
        if not directory.exists():
            print(f"⚠️ 知识库目录不存在: {directory}")
            return 0

        reader = HHUMarkdownReader()
        removed = self._remove_excluded_directory_documents(
            reader.EXCLUDED_FILENAMES
        )
        if removed:
            print(f"🧹 已清理 {removed} 篇目录说明/索引文档")
        docs = reader.load_data_from_directory(directory)
        print(f"📚 从 {directory} 加载了 {len(docs)} 篇有效文档")

        # 已索引的文件名集合（按 stored_name / file_name）
        with self._index_lock:
            indexed_names = {
                node.metadata.get("stored_name") or node.metadata.get("file_name", "")
                for node in self.index.docstore.docs.values()
            }

        added = 0
        skipped = 0
        failed = 0
        batch_size = 20

        db = connect()
        try:
            for batch_start in range(0, len(docs), batch_size):
                batch = docs[batch_start : batch_start + batch_size]
                for doc in batch:
                    original_path = doc.metadata.get(
                        "original_path"
                    ) or doc.metadata.get("file_path", "")
                    file_name = doc.metadata.get("file_name", "")
                    source_path = Path(doc.metadata.get("file_path", ""))
                    title = doc.metadata.get("title") or file_name or "未命名"
                    source_url = doc.metadata.get("source_url", "")
                    category = doc.metadata.get("category", "")

                    # 目录导入也保留一份统一存储副本，确保预览、下载和重处理可用。
                    if file_name:
                        archive_knowledge_source(source_path, file_name)

                    if file_name in indexed_names:
                        existing = db.execute(
                            "SELECT id FROM documents WHERE original_path = ? OR stored_name = ?",
                            (original_path, file_name),
                        ).fetchone()
                        if existing:
                            node_count = self._count_nodes_by_document_id(
                                int(existing["id"])
                            )
                            db.execute(
                                """
                                UPDATE documents
                                SET chunk_count = ?, processing_stage = 'DONE', updated_at = ?
                                WHERE id = ?
                                """,
                                (node_count, utc_now(), int(existing["id"])),
                            )
                        skipped += 1
                        continue

                    # 按 original_path / file_name 去重
                    existing = db.execute(
                        "SELECT id FROM documents WHERE original_path = ? OR stored_name = ?",
                        (original_path, file_name),
                    ).fetchone()

                    if existing:
                        document_id = existing["id"]
                        self.delete_document(document_id, persist=False)
                    else:
                        now = utc_now()
                        cursor = db.execute(
                            """
                            INSERT INTO documents(
                                title, filename, stored_name, mime_type, size, status,
                                processing_stage, chunk_count, source_url, category, original_path,
                                uploaded_by, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, 'READY', 'DONE', 0, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                title,
                                file_name,
                                file_name,
                                "text/markdown",
                                len(doc.text.encode("utf-8")),
                                source_url,
                                category,
                                original_path,
                                uploaded_by,
                                now,
                                now,
                            ),
                        )
                        document_id = int(cursor.lastrowid)

                    doc.metadata["document_id"] = str(document_id)
                    doc.metadata["stored_name"] = file_name

                    try:
                        self._insert_with_retry(doc)
                        node_count = self._count_nodes_by_document_id(document_id)
                        db.execute(
                            """
                            UPDATE documents
                            SET chunk_count = ?, status = 'READY',
                                processing_stage = 'DONE', error = NULL, updated_at = ?
                            WHERE id = ?
                            """,
                            (node_count, utc_now(), document_id),
                        )
                        indexed_names.add(file_name)
                        added += 1
                    except Exception as exc:
                        print(f"⚠️ 插入文档失败 {file_name}: {exc}")
                        failed += 1

                # 每批结束后提交并持久化，避免全部丢失
                db.commit()
                self._persist()
                print(
                    f"🔄 进度: {min(batch_start + batch_size, len(docs))}/{len(docs)} "
                    f"(新增 {added}, 跳过 {skipped}, 失败 {failed})"
                )
        finally:
            db.close()

        print(
            f"✅ 知识库加载完成，新增 {added} 篇，跳过 {skipped} 篇，失败 {failed} 篇"
        )
        return added

    # ------------------------------------------------------------------
    # 检索与生成
    # ------------------------------------------------------------------
    def search(self, question: str, top_k: int | None = None) -> list[dict[str, Any]]:
        """只做向量检索，不调用大模型，供 Day4 独立验收向量库效果。"""
        with self._index_lock:
            retriever = self.index.as_retriever(
                similarity_top_k=top_k or settings.top_k
            )
            return self._format_sources(retriever.retrieve(question))

    def _format_sources(self, source_nodes: list[Any]) -> list[dict[str, Any]]:
        """把 FAISS 返回的 `NodeWithScore` 列表格式化成前端友好的 sources 数组。

        关键点：
        - `i` 从 1 开始编号 → 前端 `[1] [2] [3]` 标注的依据
        - `MetadataMode.NONE` 让 content 字段不包含 metadata 块，省 token
        - `score` 四舍五入到 4 位小数（前端展示更友好）
        - 缺字段时填默认值（title→"未知来源"），保证前端不会 undefined
        """
        sources = []
        for i, node in enumerate(source_nodes, start=1):
            metadata = node.metadata or {}
            sources.append(
                {
                    "index": i,
                    "title": metadata.get("title", "未知来源"),
                    "source_url": metadata.get("source_url", ""),
                    "category": metadata.get("category", ""),
                    "score": round(float(node.score or 0.0), 4),
                    "content": node.get_content(
                        metadata_mode=MetadataMode.NONE
                    ).strip(),
                }
            )
        return sources

    def query(
        self, question: str, conversation_id: int | None = None
    ) -> dict[str, Any]:
        """单次非流式查询，返回 `{answer, sources}` 字典。

        与 `stream_query` 的区别：等模型生成完**一次性**返回。
        用于：测试、脚本、admin 后台批量调。不用于聊天 UI。
        """
        with self._index_lock:
            chat_history = self._load_chat_history(conversation_id)
            retriever = self.index.as_retriever(similarity_top_k=settings.top_k)
            chat_engine = CondensePlusContextChatEngine.from_defaults(
                retriever=retriever,
                memory=ChatMemoryBuffer.from_defaults(),
                chat_history=chat_history,
                system_prompt=HHU_SYSTEM_PROMPT,
            )
            response = chat_engine.chat(question)
            sources = self._format_sources(response.source_nodes)
            return {"answer": str(response), "sources": sources}

    def stream_query(
        self,
        question: str,
        conversation_id: int | None = None,
        top_k: int | None = None,
    ) -> Iterator[str]:
        """流式查询，yield SSE 格式的字符串（前端 `getReader()` 逐帧消费）。

        协议：
        - 第一帧 `event: meta`   data: `{sources: [...]}`（先于内容，给前端先渲染引用卡）
        - 后续 N 帧 `event: token` data: `{text: "..."}`（一个 token 一帧）
        - 最后 `event: done`       data: `{}`（前端据此停止解析）

        实现要点：
        - token 可能是 `StreamingResponseChatMessage.delta`（新版本）或纯字符串（老版本），
          兼容两种用 `hasattr(token, "delta")` 判断
        - `event: done` 是在 lock 外 yield 的（lock 只保护索引访问，不保护 yield）
        """
        with self._index_lock:
            chat_history = self._load_chat_history(conversation_id)
            retriever = self.index.as_retriever(
                similarity_top_k=top_k or settings.top_k
            )
            chat_engine = CondensePlusContextChatEngine.from_defaults(
                retriever=retriever,
                memory=ChatMemoryBuffer.from_defaults(),
                chat_history=chat_history,
                system_prompt=HHU_SYSTEM_PROMPT,
            )
            response = chat_engine.stream_chat(question)

            sources = self._format_sources(response.source_nodes)
            yield f'event: meta\ndata: {json.dumps({"sources": sources}, ensure_ascii=False)}\n\n'

            for token in response.response_gen:
                delta = token.delta if hasattr(token, "delta") else str(token)
                payload = json.dumps({"text": delta}, ensure_ascii=False)
                yield f"event: token\ndata: {payload}\n\n"

        yield "event: done\ndata: {}\n\n"

    def _load_chat_history(self, conversation_id: int | None) -> list[ChatMessage]:
        """从 SQLite `messages` 表加载历史消息，重建为 LlamaIndex `ChatMessage` 列表。

        每次请求都**全量读**这个会话的所有消息，没做增量。
        - 优点：万一中间有消息被编辑/删除，下一轮自动反映
        - 缺点：长对话（>100 轮）时 token 容易爆

        进阶方案：只读最近 N 轮 + 早轮做 summary（但本项目为简单起见不做）。
        """
        if not conversation_id:
            return []
        with closing(connect()) as db:
            rows = db.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id",
                (conversation_id,),
            ).fetchall()
        return [
            ChatMessage(
                role=(
                    MessageRole.USER if row["role"] == "USER" else MessageRole.ASSISTANT
                ),
                content=row["content"],
            )
            for row in rows
        ]


# 全局 RAG 引擎实例（启动时自动初始化，进程内单例）
rag_engine = HHURAGEngine()
