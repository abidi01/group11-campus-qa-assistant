# 校园问答助手 v1.3

面向校园办事、制度和常见问题的知识库问答系统。用户可以上传校园资料，或让 AI 联网读取公开网页生成知识文档，再通过自然语言提问获得基于知识库的回答并查看资料来源。

项目已完成 Day4-Day6 任务复核：知识库管理、RAG 问答、历史会话、测试、发布包和部署材料均已完成。详细证据见 [Day4-Day6 最终验收矩阵](docs/Day4-Day6-最终验收矩阵.md)。

## 完成状态

| 阶段 | 核心任务 | 状态 |
| --- | --- | --- |
| Day4 | 文档 CRUD、异步处理、切分、Embedding、FAISS 与管理页面 | 已完成 |
| Day5 | 同步/流式 RAG、多轮上下文、引用来源与历史会话 | 已完成 |
| Day6 | 全面测试、UI 优化、发布包、Nginx/Docker、总结与评估模板 | 已完成 |
| v1.3 | AI 网页采集、Markdown 编辑、Word 导出与角色审核入库 | 已完成 |

最新验收结果：

- 后端自动测试：7/7 通过，语句覆盖率 80%。
- 真实模型冒烟测试：通过，回答返回 5 条引用并成功保存历史。
- API 性能基线：30 次请求、并发 5、0 错误，P50 492.7ms，P95 582.1ms。
- 前端代码检查与生产构建：通过。
- 前端生产依赖安全审计：0 个已知漏洞。
- 桌面端和 390×844 移动端页面验收：通过，浏览器控制台无错误。
- AI 网页采集真实试跑：已成功读取河海大学官网并生成可编辑草稿和 Word 式预览。
- FAISS 演示索引：402 个向量，1024 维，可正常加载。
- Docker Compose 配置检查：通过。

## v1.1 创新亮点

### 1. 可解释的回答可信度

- 同步问答、SSE 流式问答和历史会话均返回统一的可信度信息。
- 综合 TopK 检索相关度、前三条来源平均相关度和独立资料覆盖数，输出 0–100 分及“高可信 / 中等可信 / 谨慎参考”等级。
- 明确说明可信度是“检索依据强度”而非事实保证；没有来源或依据较弱时主动提示用户核对原文。
- 管理端与悬浮问答 Widget 使用一致的可信度卡片、进度条和风险配色；多来源仅表示检索覆盖，不表述为事实已被交叉证明。

### 2. 情境化智能追问

- 根据当前问题中的时间、办理、申请、费用等意图，结合来源标题与知识分类生成最多 3 条下一步问题。
- 用户可直接点击追问，继续了解材料、地点、服务时间、最新通知和特殊情况联系方式。
- 追问不额外调用模型，响应稳定、无额外 Token 成本，并支持历史会话回放。

> PPT 中的 Spring Boot、MySQL、Ant Design 代码属于课堂实现示例；本项目使用 FastAPI、SQLite 与 React 自研组件完成了相同的功能验收目标，并保留 Nginx/Docker 部署能力。

## v1.2 历史会话增强

- 历史会话自动按最后问答时间倒序排列，列表展示标题、更新时间和消息数量。
- 新会话以首个问题自动生成标题；管理端支持双击重命名。
- 支持按关键词检索会话标题、用户问题和 AI 回答正文。
- 单击历史项可恢复完整问答、引用来源、可信度和情境化追问。
- 支持右键打开删除菜单，确认后级联删除该会话的全部问答记录。

## v1.3 网页知识采集

- 普通用户和管理员均可将公开 HTTP/HTTPS 地址交给支持联网提取的 AI，生成结构化 Markdown 草稿。
- 草稿支持标题与正文编辑、安全 Markdown/Word 式预览和 `.docx` 导出，并保留原网页来源。
- 普通用户提交后等待管理员审核；管理员提交后直接进入异步解析、向量化与索引流程。
- 拒绝本机、内网、非标准端口及带用户凭据的网址；网页内容按不可信数据处理，忽略其中的提示词指令。
- 知识库列表显示网页来源链接，已有预览、下载、删除和重新处理能力保持不变。

## 主要功能

### 用户与权限

- 用户注册、登录、访客体验和登录状态恢复。
- 管理员新增、编辑、停用和删除用户。
- 用户列表支持搜索、角色/状态筛选和分页。
- 用户管理仅限管理员；审核通过的知识文档对登录用户共享，普通用户只能额外查看自己提交的待审文档。

### 知识库管理

- 支持 PDF、DOC、DOCX、TXT、Markdown，单文件最大 50MB。
- 点击选择或拖拽上传，显示真实上传进度。
- 后台异步执行文本提取、重叠切分、Embedding 和 FAISS 入库。
- 展示等待、提取、索引、完成和失败状态，并自动轮询刷新。
- 支持文档搜索、状态筛选、分页、预览、下载和标题修改。
- 普通用户上传或提交网页文档后进入待审状态；管理员提交的文档直接进入索引队列。
- 管理员可以审核通过或驳回普通用户投稿，通过后自动开始解析和索引。
- 支持单篇/批量重新处理和删除；删除时同步清理数据库、原文件和向量数据。
- 提供独立 TopK 向量检索接口，返回相似度、原文片段和来源。

### AI 问答

- 提供同步 `POST /api/chat` 和 SSE 流式 `POST /api/chat/stream`。
- 基于 LlamaIndex、DashScope Embedding、FAISS 和通义千问实现 RAG。
- 回答展示来源标题、相关度和知识片段。
- 回答展示检索可信度、资料交叉佐证说明和低可信提醒。
- 自动生成可点击的情境化追问，形成连续办事引导。
- 支持多轮上下文、停止生成和异常反馈。
- 会话和消息持久化，支持完整回放、按时间排序、正文检索、自动标题、重命名和右键删除。

### 前端体验

- 科幻风响应式首页、登录页、知识库、问答和管理控制台。
- 支持桌面端与移动端布局。
- 提供空状态、加载状态、上传反馈、引用卡片、可信度卡片和文档预览。

## 技术栈

- 前端：React 19、TypeScript、Vite、Lucide、React Markdown。
- 后端：FastAPI、SQLite、Pydantic、Uvicorn。
- RAG：LlamaIndex、DashScope、FAISS、TopK 检索。
- 文档处理：pypdf、python-docx、antiword/LibreOffice（旧版 DOC）。
- 部署：Docker Compose、Nginx。

## 快速开始

### 环境要求

- Node.js 20+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/)

### 1. 安装依赖

后端：

```powershell
cd backend
uv sync --extra dev
```

前端：

```powershell
cd ../frontend
npm install
```

在已有锁文件的部署或验收环境中，推荐使用 `npm ci` 进行可复现安装。

### 2. 配置模型服务

```powershell
cd ../backend
Copy-Item .env.example .env
```

编辑 `backend/.env`：

```dotenv
APP_SECRET=请替换为较长的随机字符串
DASHSCOPE_API_KEY=请填写有效的 DashScope API Key
EMBEDDING_MODEL=text-embedding-v3
LLM_MODEL=qwen-turbo
WEB_DOCUMENT_MODEL=qwen3-max
WEB_AI_TIMEOUT_SECONDS=120
```

`.env` 已被 Git 忽略，禁止提交密钥。

`WEB_DOCUMENT_MODEL` 必须使用支持联网搜索和网页提取的模型。网页采集会将网址交给 AI 服务读取，应用服务器不会自行下载目标网页。

### 3. 初始化演示索引

如果没有 `backend/data/llama_index_storage/`，可从演示资料构建：

```powershell
cd backend
$env:KNOWLEDGE_BASE_DIR = "../knowledge-base/demo"
uv run python -m app.cli
Remove-Item Env:KNOWLEDGE_BASE_DIR
```

也可以解压发布目录中的 `campus-qa-demo-faiss-index-v1.0.0.zip`，将 `llama_index_storage` 放到 `backend/data/`。

### 4. 启动开发环境

Windows 用户可以直接双击项目根目录的 `start-dev.cmd`。脚本会自动启动后端和前端，并打开 <http://127.0.0.1:5173>。

也可以分别手动启动：

终端一：

```powershell
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

终端二：

```powershell
cd frontend
npm run dev
```

访问地址：

| 入口 | 地址 |
| --- | --- |
| 科幻风首页与问答入口 | <http://localhost:5173> |
| 管理控制台 | <http://localhost:5173/#/admin> |
| API 文档 | <http://localhost:8000/docs> |
| 健康检查 | <http://localhost:8000/api/health> |

默认本地管理员：

```text
admin@campus.example
admin123
```

默认密码只用于本地演示，正式部署前必须修改。

## 网页采集使用流程

1. 登录后进入左侧“网页采集”。
2. 输入可公开访问的 HTTP/HTTPS 地址，点击“AI 读取并生成”。
3. 在草稿区修改标题或 Markdown 正文，并可切换到“Word 预览”。
4. 如需留档，可点击“导出 Word”下载 `.docx` 副本。
5. 点击页面底部提交按钮：普通用户的文档等待管理员审核；管理员提交后直接建立知识索引。

未提交的草稿只保存在当前页面，刷新或关闭页面后会清空。系统会拒绝本机、内网、带用户凭据、非标准端口及非 HTTP/HTTPS 地址。

## 自动验收

### 后端测试与覆盖率

```powershell
cd backend
uv run pytest --cov=app --cov-report=term -q
```

### 前端检查与构建

```powershell
cd frontend
npm run lint
npm run build
```

### 真实服务冒烟测试

先启动后端，再执行：

```powershell
cd backend
uv run python ../scripts/smoke_test.py --base-url http://localhost:8000/api
```

该脚本验证健康检查、管理员登录、同步 RAG、引用来源和历史保存。脚本已明确绕过系统 HTTP 代理，避免本地请求被代理误拦截为 502。

### API 性能基线

```powershell
cd backend
uv run python ../scripts/performance_check.py --base-url http://localhost:8000/api
```

默认执行 30 次请求、并发 5，并检查错误数和 P95 响应时间。

## Docker 部署

准备好 `backend/.env` 后，在项目根目录执行：

```powershell
docker compose up -d --build
```

访问 <http://localhost:8080>。Nginx 已配置：

- React 单页应用路由回退。
- `/api` 反向代理。
- 静态资源缓存。
- SSE 关闭响应缓冲并延长读取超时。

停止服务：

```powershell
docker compose down
```

完整说明见 [Day6 部署说明](docs/day6/Day6-部署说明.md)。

## 核心接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/auth/captcha` | 获取一次性图形验证码 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 使用邮箱、密码和图形验证码登录 |
| GET/POST | `/api/documents` | 文档列表与上传 |
| PATCH/DELETE | `/api/documents/{id}` | 修改或删除文档 |
| POST | `/api/documents/{id}/review` | 管理员审核普通用户提交的文档 |
| POST | `/api/documents/{id}/reprocess` | 重新处理文档 |
| POST | `/api/web-documents/generate` | 由 AI 联网读取网页并生成 Markdown 草稿 |
| POST | `/api/web-documents/export` | 将编辑后的网页知识文档导出为 Word |
| POST | `/api/web-documents/submit` | 按当前用户角色提交审核或直接进入索引队列 |
| POST | `/api/search` | 独立 TopK 向量检索 |
| POST | `/api/chat` | 同步 RAG 问答 |
| POST | `/api/chat/stream` | SSE 流式 RAG 问答 |
| GET | `/api/conversations` | 历史会话列表 |
| GET/PATCH/DELETE | `/api/conversations/{id}` | 会话详情、重命名和删除 |
| GET/POST | `/api/users` | 管理员用户管理 |

## 最终交付物

项目文档：

- [Day4-Day6 最终验收矩阵](docs/Day4-Day6-最终验收矩阵.md)
- [Day4 业务模块开发说明](docs/day4/Day4-业务模块开发说明.md)
- [Day4 团队日报](docs/day4/Day4-团队日报_2026-07-17.md)
- [Day5 AI 模块完成报告](docs/day5/Day5-完成报告.md)
- [Day5 团队日报](docs/day5/Day5-团队日报_2026-07-17.md)
- [Day6 测试报告](docs/day6/Day6-测试报告.md)
- [Day6 部署说明](docs/day6/Day6-部署说明.md)
- [Day6 团队日报](docs/day6/Day6-团队日报_2026-07-17.md)
- [项目总结](docs/day6/项目总结.md)
- [答辩演示剧本](docs/day6/答辩演示剧本.md)
- [发布清单](docs/day6/发布清单.md)

仓库只保留团队级交付材料，不包含成员个人日报或个人评估信息。

发布文件位于 `output/release/`：

- `campus-qa-source-v1.0.0.zip`：最终源码包。
- `campus-qa-frontend-static-v1.0.0.zip`：前端生产静态文件。
- `campus_qa_backend-1.0.0-py3-none-any.whl`：后端 Python 安装包。
- `campus_qa_backend-1.0.0.tar.gz`：后端源码分发包。
- `campus-qa-deployment-v1.0.0.zip`：部署配置和说明。
- `campus-qa-demo-faiss-index-v1.0.0.zip`：演示 FAISS 索引与元数据。

发布包不包含 `.env`、模型密钥、本地数据库或依赖缓存。

## 项目结构

```text
campus-qa-assistant/
├── backend/            FastAPI、SQLite、RAG、文档处理与自动测试
├── frontend/           React 首页、问答、知识库、网页采集与管理控制台
├── knowledge-base/
│   └── demo/           演示知识资料
├── scripts/            冒烟测试、性能检查和辅助脚本
├── docs/               Day4-Day6 报告、验收矩阵、部署说明与截图
├── site-snapshot/      门户与嵌入式 Widget 的精简快照
├── docker-compose.yml  容器编排配置
└── output/release/     本地生成的最终发布物
```

## 代码仓库与后续发布

- GitHub：<https://github.com/abidi01/group11-campus-qa-assistant>
- 默认分支：`main`
- 源码已经同步到 GitHub；本地 `.env`、模型密钥、数据库和依赖缓存不会上传。
- Release 附件和目标服务器部署仍需根据课程提交要求单独执行。
- 成员自评与互评分数应由团队成员本人确认填写。
