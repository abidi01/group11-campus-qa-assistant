# Day4 业务模块开发说明

## 实现范围

本次在现有 FastAPI、SQLite、React、LlamaIndex 与 FAISS 架构上完成知识库业务模块，不单独拆分 Spring Boot/Python 两个服务。功能目标与课件一致：文档上传后自动完成文本提取、切分、Embedding、FAISS 入库，并能管理文档和验证 TopK 检索结果。

知识库权限不与 STUDENT/ADMIN 角色绑定：所有已登录用户（含访客账号）都可以查看、上传、修改、重新处理和删除知识库文档；只有“用户与权限”模块仍要求 ADMIN 角色。

## 后端能力

- 支持 PDF、DOC、DOCX、TXT、Markdown，单文件最大 50MB，并拒绝空文件和错误格式。
- 上传接口先保存原文件和文档记录，再提交后台线程池，立即返回文档 ID 与 PENDING 状态。
- 处理状态为 `PENDING -> PROCESSING -> READY/ERROR`，并通过 `processing_stage` 暴露 QUEUED、EXTRACTING、INDEXING、DONE、FAILED 阶段。
- 使用 500 Token 左右的切分大小和重叠窗口，调用 DashScope Embedding，经 LlamaIndex 写入持久化 FAISS 索引和 docstore 元数据。
- 每个向量节点保存 document_id、title、category、source_url、stored_name 等来源信息。
- 文档更新会自动重建对应索引；重新处理具备幂等性，会先清理旧节点。
- 删除同时清理 SQLite 记录、FAISS/docstore 节点和上传文件。
- 文档列表支持关键字、状态筛选与分页，并返回文档/切片/处理中/失败统计。
- `POST /api/search` 只执行向量 TopK 检索，不调用大模型，便于独立验收向量结果和来源。

## 前端能力

- 支持点击选择与拖拽上传，上传前校验格式和 50MB 上限，并显示真实上传百分比。
- 支持 PDF 在线预览、DOC/DOCX/TXT/Markdown 文本预览及原文件下载。
- 支持勾选多篇资料后批量重新处理或批量删除。
- 展示资料总数、可检索文档数、知识片段数、文件类型、大小、处理阶段与错误信息。
- 处理中自动每 3 秒刷新，完成或失败后停止轮询。
- 支持标题/文件名搜索、状态筛选和分页。
- 支持修改标题并自动重建索引、重新处理和级联删除。
- 处理中的文档禁用编辑、重试和删除，避免并发操作破坏索引一致性。

## 接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/documents` | 文档分页、搜索、状态筛选与汇总 |
| POST | `/api/documents` | 上传并异步处理 |
| PATCH | `/api/documents/{id}` | 更新标题/分类并重建索引 |
| POST | `/api/documents/{id}/reprocess` | 重新处理文档 |
| DELETE | `/api/documents/{id}` | 删除文档、文件和向量 |
| POST | `/api/search` | TopK 向量检索 |

以上接口均要求登录，但不校验 STUDENT/ADMIN 角色。

## 验收结果

- [x] 可上传 PDF、DOC、DOCX、TXT、Markdown 文档。
- [x] 可预览、下载原始文档。
- [x] 支持批量重新处理与批量删除。
- [x] 上传进度显示真实百分比。
- [x] 文档在后台自动完成切分、向量化和持久化入库。
- [x] 可查看文档列表、分页、筛选和实时处理状态。
- [x] 可修改或重新处理文档，旧向量不会重复累积。
- [x] 可删除文档及对应向量和原文件。
- [x] 独立向量检索可返回 TopK 文本块、相似度和来源标题。
- [x] 普通用户和管理员均可完整使用知识库模块。
- [x] 后端自动化测试、前端静态检查和生产构建通过。

## 本地验证

```powershell
cd backend
uv sync --extra dev
uv run pytest -q

cd ..\frontend
npm run lint
npm run build
```

实际接入 DashScope 时需在 `backend/.env` 配置有效的 `DASHSCOPE_API_KEY`；自动化测试使用本地伪 Embedding 与伪 LLM，不消耗外部 API Token。
