from io import BytesIO
from pathlib import Path
import shutil
import subprocess
import tempfile

from docx import Document as DocxDocument
from pypdf import PdfReader


def _decode_command_output(data: bytes) -> str:
    for encoding in ("utf-8", "gb18030", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def _extract_legacy_doc(data: bytes) -> str:
    """Extract text from the legacy binary Word `.doc` format.

    `python-docx` only understands OOXML `.docx`. For old `.doc` files we first
    use antiword, then fall back to LibreOffice headless conversion. Both tools
    run without a shell and inside an isolated temporary directory.
    """
    errors: list[str] = []
    with tempfile.TemporaryDirectory(prefix="campus-qa-doc-") as temp_dir:
        source = Path(temp_dir) / "source.doc"
        source.write_bytes(data)

        antiword = shutil.which("antiword")
        if antiword:
            try:
                result = subprocess.run(
                    [antiword, str(source)],
                    capture_output=True,
                    check=True,
                    timeout=60,
                )
                text = _decode_command_output(result.stdout).strip()
                if text:
                    return text
            except (OSError, subprocess.SubprocessError) as exc:
                errors.append(f"antiword: {exc}")

        soffice = shutil.which("soffice")
        if soffice:
            try:
                subprocess.run(
                    [
                        soffice,
                        "--headless",
                        "--convert-to",
                        "txt:Text",
                        "--outdir",
                        temp_dir,
                        str(source),
                    ],
                    capture_output=True,
                    check=True,
                    timeout=90,
                )
                converted = Path(temp_dir) / "source.txt"
                if converted.exists():
                    text = _decode_command_output(converted.read_bytes()).lstrip("\ufeff").strip()
                    if text:
                        return text
            except (OSError, subprocess.SubprocessError) as exc:
                errors.append(f"LibreOffice: {exc}")

    detail = "；".join(errors) if errors else "系统未安装 antiword 或 LibreOffice"
    raise ValueError(f"旧版 DOC 文档解析失败：{detail}")


def extract_text(data: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md"}:
        return data.decode("utf-8", errors="ignore")
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        document = DocxDocument(BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    if suffix == ".doc":
        return _extract_legacy_doc(data)
    raise ValueError("仅支持 TXT、Markdown、PDF、DOC 和 DOCX 文件")
