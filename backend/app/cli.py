"""命令行工具：预构建 LlamaIndex 知识库索引。"""

from .config import settings
from .database import init_database, transaction, utc_now
from .rag_engine_v2 import rag_engine
from .security import hash_password


def _ensure_system_user() -> int:
    """确保存在系统管理员账号，用于知识库文档归属。"""
    with transaction() as db:
        row = db.execute(
            "SELECT id FROM users WHERE email = ?", ("system@campus.example",)
        ).fetchone()
        if row:
            return int(row["id"])
        cursor = db.execute(
            """
            INSERT INTO users(name, email, password_hash, role, is_active, created_at)
            VALUES (?, ?, ?, 'ADMIN', 1, ?)
            """,
            ("系统", "system@campus.example", hash_password("system"), utc_now()),
        )
        return int(cursor.lastrowid)


def main() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    init_database()
    system_user_id = _ensure_system_user()
    print(f"开始构建索引: {settings.knowledge_base_dir}")
    count = rag_engine.load_knowledge_base(
        settings.knowledge_base_dir, uploaded_by=system_user_id
    )
    print(f"完成，共处理 {count} 篇文档")


if __name__ == "__main__":
    main()
