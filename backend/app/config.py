from dataclasses import dataclass, field
from pathlib import Path
import os
import platform

from dotenv import load_dotenv

# macOS 上多个依赖（faiss / torch / numpy）可能链接不同 libomp，导致初始化崩溃
if platform.system() == "Darwin" and os.environ.get("KMP_DUPLICATE_LIB_OK") is None:
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"


BASE_DIR = Path(__file__).resolve().parents[1]
# 系统环境变量优先级高于 .env，便于从 shell 注入敏感配置
load_dotenv(BASE_DIR / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    app_secret: str = os.getenv("APP_SECRET", "campus-qa-local-development-secret")
    database_path: Path = Path(
        os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "campus_qa.db"))
    )
    upload_dir: Path = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "data" / "uploads")))
    data_dir: Path = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
    knowledge_base_dir: Path = Path(
        os.getenv("KNOWLEDGE_BASE_DIR", str(BASE_DIR.parent / "knowledge-base"))
    )
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    frontend_origins: list[str] = field(
        default_factory=lambda: sorted(
            {
                *[
                    origin.strip()
                    for origin in os.getenv(
                        "FRONTEND_ORIGINS",
                        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
                    ).split(",")
                    if origin.strip()
                ],
                # 常用本地开发/演示端口默认放行
                "http://localhost:5173",
                "http://localhost:5180",
                "http://localhost:5181",
                "http://localhost:8080",
                "http://localhost:8081",
            }
        )
    )
    # DashScope (阿里云百炼平台) — Embedding 与 LLM 共用同一套 key
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "")
    dashscope_base_url: str = os.getenv(
        "DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com"
    )
    # LLM 默认使用 DashScope 通义千问；如使用 OpenAI 兼容接口可改 base_url/key
    llm_api_key: str = os.getenv("LLM_API_KEY", os.getenv("DASHSCOPE_API_KEY", ""))
    llm_base_url: str = os.getenv(
        "LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    llm_model: str = os.getenv("LLM_MODEL", "qwen-turbo")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-v3")
    top_k: int = int(os.getenv("TOP_K", "5"))
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "500"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "100"))
    token_minutes: int = 60 * 24
    # Day4 验收要求：单个知识库文档最大 50MB。
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
    web_document_model: str = os.getenv("WEB_DOCUMENT_MODEL", "qwen3-max")
    web_ai_timeout_seconds: float = float(os.getenv("WEB_AI_TIMEOUT_SECONDS", "120"))


settings = Settings()
