"""河海大学文档加载器 - 清洗导航文字并保留有效内容"""

from pathlib import Path
from typing import List

from llama_index.core.readers.base import BaseReader
from llama_index.core.schema import Document

# 河海大学官网导航关键词（需要清洗的重复内容）
NAV_KEYWORDS = {
    "信息门户",
    "邮箱",
    "EN",
    "首页",
    "学校概况",
    "学校简介",
    "大学章程",
    "历史名人",
    "历任党政负责人",
    "现任领导",
    "院系部门",
    "院系设置",
    "党政职能部门",
    "群团组织",
    "派出机构",
    "直属单位",
    "科学研究",
    "科研动态",
    "学术会议",
    "科研机构",
    "科研成果",
    "学术期刊",
    "管理部门",
    "信息公告",
    "教育教学",
    "师资队伍",
    "本科生培养",
    "研究生培养",
    "留学生培养",
    "终身教育",
    "人才招聘",
    "招生就业",
    "本科生招生",
    "研究生招生",
    "留学生招生",
    "终身教育招生",
    "就业指导",
    "合作交流",
    "国际合作与交流",
    "国内合作发展",
    "基金会",
    "校友会",
    "校园生活",
    "校园文化",
    "校园景观",
    "校园服务",
    "图书档案",
    "上一篇",
    "下一篇",
    "发布时间",
    "文章来源",
    "♦",
}


def clean_hhu_text(text: str) -> str:
    """清洗河海大学文档中的导航文字和无效内容。"""
    cleaned_lines: list[str] = []
    nav_streak = 0
    max_nav_streak = 5  # 连续 5 个导航词后截断

    for line in text.split("\n"):
        stripped = line.strip()

        # 跳过空行
        if not stripped:
            continue

        # 检测导航关键词或过短的无意义片段
        is_nav = stripped in NAV_KEYWORDS or len(stripped) <= 2

        if is_nav:
            nav_streak += 1
            if nav_streak >= max_nav_streak:
                # 连续导航词超过阈值，跳过
                continue
        else:
            nav_streak = 0
            cleaned_lines.append(line)

    # 二次清洗：去除开头的重复标题行
    result = "\n".join(cleaned_lines).strip()
    return _deduplicate_headers(result)


def _deduplicate_headers(text: str) -> str:
    """去除文档开头的重复标题"""
    lines = text.split("\n")
    if len(lines) < 2:
        return text

    # 如果前两行内容相同（去除空格后），删除第二行
    seen = set()
    deduped = []
    for line in lines[:10]:  # 只检查前10行
        normalized = line.strip().replace(" ", "").replace("\u3000", "")
        if normalized and normalized in seen:
            continue
        if normalized:
            seen.add(normalized)
        deduped.append(line)

    # 剩余行直接追加
    deduped.extend(lines[10:])

    return "\n".join(deduped).strip()


def parse_frontmatter(content: str) -> tuple[dict[str, str], str]:
    """解析 Markdown frontmatter，返回 (metadata, body)。"""
    metadata: dict[str, str] = {}
    body = content

    if content.startswith("---"):
        # 最多按 --- 切分 2 次，避免正文中的 --- 被误解析
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            body = parts[2].strip()
            for line in fm_text.split("\n"):
                if ":" not in line:
                    continue
                key, value = line.split(":", 1)
                metadata[key.strip()] = value.strip()

    return metadata, body


class HHUMarkdownReader(BaseReader):
    """河海大学Markdown文档加载器 - 自动清洗导航文字"""

    EXCLUDED_FILENAMES = {"readme.md", "index.md"}

    def load_data(self, file_path: Path | str, **kwargs) -> List[Document]:
        """加载并清洗单个Markdown文件"""
        file_path = Path(file_path)
        if file_path.name.lower() in self.EXCLUDED_FILENAMES:
            return []
        content = file_path.read_text(encoding="utf-8")

        # 解析frontmatter
        metadata, body = parse_frontmatter(content)

        # 清洗导航文字
        cleaned_body = clean_hhu_text(body)

        # 如果清洗后内容为空，跳过
        if not cleaned_body or len(cleaned_body) < 50:
            return []

        # 构建文档元数据
        doc_metadata = {
            "title": metadata.get("title", file_path.stem),
            "source_url": metadata.get("source_url", ""),
            "original_path": metadata.get("original_path", ""),
            "category": metadata.get("category", ""),
            "file_name": file_path.name,
            "file_path": str(file_path),
        }

        return [Document(text=cleaned_body, metadata=doc_metadata)]

    def load_data_from_directory(
        self, directory: Path | str, **kwargs
    ) -> List[Document]:
        """递归加载目录下所有Markdown文件"""
        directory = Path(directory)
        documents = []

        for md_file in directory.rglob("*.md"):
            docs = self.load_data(md_file)
            documents.extend(docs)

        return documents
