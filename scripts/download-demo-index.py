#!/usr/bin/env python3
"""下载预构建的 Demo 向量库，避免重复消耗 Embedding Token。

用法：
    python scripts/download-demo-index.py [OWNER/REPO] [TAG]

默认从 campus-practice 仓库的最新 Release 下载 campus-qa-demo-index-v1.tar.gz，
解压到 backend/data/llama_index_storage/。若下载失败，可改用本地构建：

    cd backend && KNOWLEDGE_BASE_DIR=../knowledge-base/demo uv run python -m app.cli
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
import tarfile
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INDEX_DIR = PROJECT_ROOT / "backend" / "data" / "llama_index_storage"
ASSET_NAME = "campus-qa-demo-index-v1.tar.gz"
EXPECTED_SHA256 = "02f43b138215c23d061005715474b80b7b1726c7bc022787295e1c0b4f65cca5"


def _detect_repo() -> str:
    """尝试从 git remote 推断 owner/repo。"""
    import subprocess

    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        url = result.stdout.strip()
        # 支持 https://github.com/owner/repo.git 或 git@github.com:owner/repo.git
        if url.startswith("https://github.com/"):
            return url[len("https://github.com/") :].removesuffix(".git")
        if url.startswith("git@github.com:"):
            return url[len("git@github.com:") :].removesuffix(".git")
    except Exception:
        pass
    return ""


def _download(url: str, dest: Path) -> None:
    print(f"⬇️  下载: {url}")
    req = urllib.request.Request(
        url, headers={"User-Agent": "campus-qa-demo-index/1.0"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="下载 Demo 向量库")
    parser.add_argument(
        "repo",
        nargs="?",
        default="",
        help="GitHub 仓库，格式 owner/repo（默认从 git remote 推断）",
    )
    parser.add_argument(
        "--tag",
        default="v1.0.0-demo",
        help="Release 标签（默认 v1.0.0-demo）",
    )
    parser.add_argument(
        "--skip-sha256",
        action="store_true",
        help="跳过 SHA256 校验",
    )
    args = parser.parse_args()

    repo = args.repo or _detect_repo()
    if not repo:
        print(
            "❌ 无法推断 GitHub 仓库。请提供 owner/repo，例如:\n"
            "   python scripts/download-demo-index.py your-name/campus-practice"
        )
        return 1

    if "/" not in repo:
        print(f"❌ 仓库格式错误: {repo}，应为 owner/repo")
        return 1

    url = f"https://github.com/{repo}/releases/download/{args.tag}/{ASSET_NAME}"
    tmp_file = PROJECT_ROOT / ".tmp-demo-index.tar.gz"

    try:
        _download(url, tmp_file)
    except urllib.error.HTTPError as e:
        print(f"❌ 下载失败: {e.code} {e.reason}")
        print(f"   URL: {url}")
        print(
            "\n可尝试手动构建（会消耗 2 个文档的 Embedding Token）:\n"
            "   cd backend && KNOWLEDGE_BASE_DIR=../knowledge-base/demo uv run python -m app.cli"
        )
        return 1
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        return 1

    if not args.skip_sha256:
        actual = _sha256(tmp_file)
        if actual != EXPECTED_SHA256:
            print(f"❌ SHA256 校验失败")
            print(f"   期望: {EXPECTED_SHA256}")
            print(f"   实际: {actual}")
            print("   可使用 --skip-sha256 跳过校验，或检查 Release asset 是否更新")
            tmp_file.unlink(missing_ok=True)
            return 1
        print("✅ SHA256 校验通过")

    # 清理旧索引
    if INDEX_DIR.exists():
        shutil.rmtree(INDEX_DIR)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    with tarfile.open(tmp_file, "r:gz") as tar:
        # Python 3.12+ 要求显式 filter 以避免 DeprecationWarning
        if hasattr(tarfile, "data_filter"):
            tar.extractall(path=INDEX_DIR.parent, filter="data")
        else:
            tar.extractall(path=INDEX_DIR.parent)

    tmp_file.unlink(missing_ok=True)

    print(f"✅ 向量库已解压到: {INDEX_DIR}")
    print("   现在可以启动后端: cd backend && uv run uvicorn app.main:app --reload")
    return 0


if __name__ == "__main__":
    sys.exit(main())
