"""Resolve and preserve original files used by knowledge-base records."""

from pathlib import Path
import shutil
from typing import Mapping, Any

from .config import settings


def _value(document: Mapping[str, Any], key: str) -> Any:
    try:
        return document[key]
    except (KeyError, IndexError):
        return None


def stored_document_path(stored_name: str) -> Path:
    """Return the canonical upload path without allowing directory traversal."""
    return settings.upload_dir / Path(stored_name).name


def _inside_knowledge_base(path: Path) -> bool:
    try:
        path.resolve().relative_to(settings.knowledge_base_dir.resolve())
        return True
    except (OSError, ValueError):
        return False


def resolve_document_path(document: Mapping[str, Any]) -> Path | None:
    """Find a document in uploads, then safely fall back to the source corpus.

    Directory-imported Markdown records created before source-file archiving may
    only have a searchable index entry. Their source remains under
    ``knowledge_base_dir`` and is safe to expose to authenticated users.
    """
    stored_name = str(_value(document, "stored_name") or "")
    if stored_name:
        stored_path = stored_document_path(stored_name)
        if stored_path.is_file():
            return stored_path

    original_path = str(_value(document, "original_path") or "").strip()
    if original_path:
        original = Path(original_path)
        if original.is_file() and _inside_knowledge_base(original):
            return original

    filename = Path(str(_value(document, "filename") or "")).name
    if not filename or not settings.knowledge_base_dir.is_dir():
        return None
    for candidate in settings.knowledge_base_dir.rglob("*"):
        if (
            candidate.is_file()
            and candidate.name == filename
            and _inside_knowledge_base(candidate)
        ):
            return candidate
    return None


def archive_knowledge_source(source: Path, stored_name: str) -> Path | None:
    """Copy a corpus source into uploads so preview/download remain portable."""
    if not source.is_file() or not _inside_knowledge_base(source):
        return None
    destination = stored_document_path(stored_name)
    if destination.is_file():
        return destination
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return destination
