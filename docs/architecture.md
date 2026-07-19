# 河海大学校园问答助手 — 细化需求与架构设计文档

> 版本：v2.0（河海大学定制版）
> 日期：2026-07-01
> 目标部署：嵌入河海大学官网门户（www.hhu.edu.cn）
> 面向用户：河海大学信管专业大三学生（实训项目）

## 说明

本文档描述的是面向河海大学官网门户的完整部署架构与目标设计，包含对完整知识库（约 1,097 篇文档）的规划。当前仓库为精简演示版，仅保留 `knowledge-base/demo/` 下的 2 份示例文档，便于本地教学与快速体验。核心架构、技术选型与接口设计在精简版中保持一致。

---

## 目录

1. [项目概述](#1-项目概述)
2. [需求细化](#2-需求细化)
3. [系统架构设计](#3-系统架构设计)
4. [RAG 架构设计（LlamaIndex + DashScope）](#4-rag-架构设计llamaindex--dashscope)
5. [数据库设计](#5-数据库设计)
6. [API 接口设计](#6-api-接口设计)
7. [前端架构设计](#7-前端架构设计)
8. [门户嵌入方案](#8-门户嵌入方案)
9. [部署架构](#9-部署架构)
10. [实训课程对应](#10-实训课程对应)

---

## 1. 项目概述

### 1.1 项目背景

河海大学校园问答助手是一个面向全校师生的智能问答系统，基于 **LlamaIndex** RAG 框架和 **阿里云百炼平台（DashScope）** 大模型能力，为河海大学官网门户提供嵌入式问答机器人服务。

系统以河海大学官网提取的 **1097篇知识库文档** 为数据源，覆盖学校概况、组织机构、教育教学、科学研究、招生就业、人才招聘、信息公开、新闻动态等八大领域。

### 1.2 项目目标

- 为河海大学师生提供 **7×24小时** 校园知识智能问答服务
- 以 **浮动气泡** 形式嵌入官网任意页面，自然无侵入
- 支持 **多轮对话上下文**，提供连贯的问答体验
- 答案附带 **来源引用**，可追溯到官网原始页面
- 所有登录用户均可查看、上传和管理知识库文档，实时更新问答内容

### 1.3 核心数据

| 数据项 | 数量 | 说明 |
|--------|------|------|
| 知识库文档 | **1,097 篇** | Markdown格式，从官网提取 |
| 文档分类 | **8 大类** | 学校概况、组织机构、教育教学、科学研究、招生就业、人才招聘、信息公开、新闻动态 |
| 附件文件 | **65 个** | PDF、DOC、DOCX、ZIP等 |
| 覆盖页面 | **1,000+** | 官网主要栏目 |

### 1.4 技术选型

| 层级 | 技术 | 版本/型号 | 说明 |
|------|------|-----------|------|
| RAG框架 | **LlamaIndex** | 0.12.x | 文档加载、索引、检索、查询引擎 |
| Embedding | **DashScope** | text-embedding-v3 | 1024维向量，阿里云百炼平台 |
| LLM | **DashScope** | qwen-turbo | 通义千问Turbo，快速响应 |
| 向量存储 | **FAISS** | 1.13.x | 本地向量数据库，高效相似度检索 |
| 后端框架 | **FastAPI** | 0.115.x | Python异步Web框架 |
| 数据库 | **SQLite** | 3.x | 用户、文档元数据、会话历史 |
| 前端框架 | **React** | 19.x | 组件化UI |
| 构建工具 | **Vite** | 6.x | 前端构建 |
| 样式 | **Tailwind CSS** | 3.x | 原子化CSS |
| 状态管理 | **Zustand** | 5.x | 轻量级状态管理 |

---

## 2. 需求细化

### 2.1 用户角色

| 角色 | 描述 | 典型场景 |
|------|------|----------|
| **学生** | 河海大学在校生 | "图书馆几点关门？"、"奖学金怎么申请？"、"转专业流程是什么？" |
| **教师** | 河海大学教职工 | "科研经费报销流程"、"教学评估时间安排" |
| **访客** |  prospective students / 校外人员 | "学校有哪些王牌专业？"、"录取分数线是多少？"、"校园开放日时间" |
| **管理员** | 系统维护人员 | 普通用户全部能力 + 用户与权限管理 |
| **登录用户** | 学生、教师、访客账号 | 校园问答、会话历史、知识库查看/上传/更新/删除 |

### 2.2 用户故事（User Stories）

#### US-HHU-001: 官网访客快速问答
> 作为访问河海大学官网的高中生，我希望在浏览招生页面时快速询问录取相关问题，无需跳转其他页面。

- **验收标准**:
  - 浮动气泡始终显示在页面右下角
  - 点击气泡展开聊天窗口
  - 输入问题后3秒内开始返回答案
  - 答案包含来源链接，可点击跳转到官网详情页

#### US-HHU-002: 学生日常咨询
> 作为河海大学学生，我希望询问校园生活中的常见问题，如图书馆开放时间、食堂位置、校车时刻等。

- **验收标准**:
  - 支持连续多轮对话，系统记住上下文
  - 答案基于学校官方文档，准确可靠
  - 支持查看历史会话记录

#### US-HHU-003: 登录用户知识库维护
> 作为已登录用户，我希望上传新的校园资料到知识库，让问答系统能回答最新问题。

- **验收标准**:
  - 支持上传 PDF、Word、Markdown 等格式
  - 上传后自动解析、切分、向量化
  - 支持查看文档处理状态
  - 支持删除过期文档

#### US-HHU-004: 招生季高峰应对
> 作为招生办老师，我希望在高考志愿填报期间，系统能自动回答大量重复的招生咨询问题。

- **验收标准**:
  - 支持高并发访问（50+同时在线）
  - 响应时间 < 3秒
  - 答案准确，减少人工客服压力

### 2.3 功能需求

#### 2.3.1 浮动问答机器人（核心功能）

| 功能点 | 需求描述 | 优先级 |
|--------|----------|--------|
| 浮动气泡 | 右下角圆形气泡，显示机器人图标，未读消息红点提示 | P0 |
| 聊天窗口 | 点击气泡展开，支持展开/收起/拖拽 | P0 |
| 消息输入 | 文本输入框，支持Enter发送，Shift+Enter换行 | P0 |
| 流式回答 | SSE流式输出，打字机效果，实时显示 | P0 |
| 来源引用 | 答案中[1][2]标注，点击展开来源卡片（标题+链接） | P0 |
| 多轮对话 | 支持上下文关联，连续追问 | P0 |
| 历史会话 | 侧边栏显示历史会话列表，点击切换 | P1 |
| 新会话 | 支持创建新会话，清空上下文 | P1 |
| 快捷问题 | 预设常见问题快捷按钮（如"图书馆开放"、"奖学金申请"） | P2 |
| 语音输入 | 支持语音转文字输入 | P3 |

#### 2.3.2 校园知识工作台

| 功能点 | 需求描述 | 优先级 |
|--------|----------|--------|
| 登录/注册 | 普通用户与管理员账号登录 | P0 |
| 文档上传 | 上传知识库文档，支持批量 | P0 |
| 文档列表 | 查看所有文档，显示处理状态 | P0 |
| 文档删除 | 删除文档，同步清理向量 | P0 |
| 用户管理 | 查看/禁用用户账号 | P1 |
| 问答统计 | 查看问答次数、热门问题 | P2 |
| 系统配置 | 配置LLM模型参数、Prompt模板 | P2 |

### 2.4 非功能需求

#### 2.4.1 性能需求

| 指标 | 目标值 | 测试方法 |
|------|--------|----------|
| 首字响应时间 | ≤ 2秒 | 从发送问题到首字返回 |
| 完整回答时间 | ≤ 8秒（LLM模式） | 从发送问题到回答完成 |
| 浮动气泡加载 | ≤ 1秒 | 页面加载后气泡出现时间 |
| 并发用户数 | ≥ 50 | 压力测试 |
| 知识库检索 | ≤ 500ms | TopK向量检索时间 |

#### 2.4.2 安全需求

| 需求 | 实现方式 |
|------|----------|
| 传输加密 | HTTPS（生产环境） |
| 身份认证 | JWT Token，24小时过期 |
| 权限控制 | RBAC（学生/管理员） |
| 输入过滤 | XSS过滤、SQL注入防护 |
| 文件上传 | 扩展名白名单 + 大小限制 |
| API限流 | 每分钟100次请求 |

#### 2.4.3 可用性需求

| 需求 | 说明 |
|------|------|
| 响应式适配 | 支持桌面端和移动端 |
| 网络提示 | DashScope API 不可用时显示友好提示 |
| 加载状态 | 上传、处理等操作显示进度 |
| 错误恢复 | API失败时自动重试并显示错误提示 |
| 无障碍 | 支持键盘操作、屏幕阅读器 |

---

## 3. 系统架构设计

### 3.1 总体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          河海大学官网门户 (www.hhu.edu.cn)                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  页面内容...                                                            │ │
│  │                                                                         │ │
│  │                                    ┌─────────────┐                     │ │
│  │                                    │  🤖 浮动气泡 │  ← 嵌入脚本注入      │ │
│  │                                    └──────┬──────┘                     │ │
│  │                                           │                           │ │
│  │                                    ┌──────▼──────┐                     │ │
│  │                                    │  聊天窗口   │                     │ │
│  │                                    │  ┌───────┐  │                     │ │
│  │                                    │  │消息区 │  │                     │ │
│  │                                    │  │输入框 │  │                     │ │
│  │                                    │  └───────┘  │                     │ │
│  │                                    └─────────────┘                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / REST / SSE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              后端服务层 (FastAPI)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      ││
│  │  │ 认证模块   │  │ 问答模块   │  │ 知识库模块 │  │ 用户模块   │      ││
│  │  │ Auth       │  │ Chat       │  │ Documents  │  │ Users      │      ││
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         LlamaIndex RAG 引擎                             ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      ││
│  │  │ Document   │  │ Text       │  │ DashScope  │  │ FAISS      │      ││
│  │  │ Reader     │→ │ Splitter   │→ │ Embedding  │→ │ VectorStore│      ││
│  │  │ (Markdown) │  │ (Chunk)    │  │ (v3, 1024D)│  │ (Index)    │      ││
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      ││
│  │                                                                         ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                      ││
│  │  │ Query      │  │ Retriever  │  │ Qwen-Turbo │                      ││
│  │  │ Engine     │→ │ (TopK)     │→ │ (LLM)      │                      ││
│  │  │            │  │            │  │ (DashScope)│                      ││
│  │  └────────────┘  └────────────┘  └────────────┘                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│    SQLite 数据库      │  │   FAISS 向量库       │  │  DashScope API      │
│  ┌─────────────────┐  │  │  ┌─────────────────┐  │  │  ┌─────────────────┐│
│  │ users           │  │  │  │ hhu_index.faiss │  │  │  │ text-embedding-v3││
│  │ documents       │  │  │  │ hhu_index.pkl   │  │  │  │ qwen-turbo      ││
│  │ conversations   │  │  │  │                 │  │  │  │                 ││
│  │ messages        │  │  │  │                 │  │  │  │                 ││
│  └─────────────────┘  │  │  └─────────────────┘  │  │  └─────────────────┘│
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### 3.2 分层架构

| 层级 | 组件 | 职责 |
|------|------|------|
| **表现层** | 浮动气泡组件、校园知识工作台 | 用户交互、UI渲染 |
| **应用层** | FastAPI路由、Pydantic模型 | 请求处理、参数校验、响应序列化 |
| **业务层** | LlamaIndex引擎、RAG服务 | 文档索引、检索、答案生成 |
| **数据层** | SQLite、FAISS、文件系统 | 用户数据、向量索引、文档存储 |
| **外部层** | DashScope API | Embedding、LLM推理 |

### 3.3 模块划分

#### 后端模块结构

```
backend/app/
├── __init__.py
├── config.py              # 配置管理（含DashScope配置）
├── database.py            # SQLite数据库连接与Schema
├── security.py            # JWT认证、密码加密
├── main.py                # FastAPI应用入口
├── rag/
│   ├── __init__.py
│   ├── engine.py          # LlamaIndex引擎初始化
│   ├── index_manager.py   # 索引构建、加载、更新
│   ├── retriever.py       # 检索器配置（TopK、相似度阈值）
│   └── query_engine.py    # 查询引擎（多轮对话支持）
├── routers/
│   ├── __init__.py
│   ├── auth.py            # 认证路由
│   ├── chat.py            # 问答路由（SSE流式）
│   ├── documents.py       # 文档管理路由
│   ├── users.py           # 用户管理路由
│   └── stats.py           # 统计路由
├── services/
│   ├── __init__.py
│   ├── auth_service.py
│   ├── chat_service.py    # 多轮对话上下文管理
│   ├── document_service.py
│   └── rag_service.py     # LlamaIndex RAG服务封装
├── models/
│   ├── __init__.py
│   ├── auth.py
│   ├── chat.py
│   ├── document.py
│   └── user.py
└── utils/
    ├── __init__.py
    └── hhu_cleaner.py     # 河海大学文档清洗工具
```

---

## 4. RAG 架构设计（LlamaIndex + DashScope）

### 4.1 核心流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LlamaIndex RAG 处理流程                              │
└─────────────────────────────────────────────────────────────────────────────┘

【知识库构建阶段】（系统初始化/文档更新时执行）

  knowledge-base/
  ├── 01_学校概况/*.md
  ├── 02_组织机构/*.md
  ├── ...
  └── 08_新闻动态/*.md
         │
         ▼
  ┌────────────┐
  │ 1. 文档加载 │  SimpleDirectoryReader + 自定义HHUMarkdownReader
  │            │  读取Markdown，提取frontmatter（title, source_url, category）
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 2. 文档清洗 │  去除导航文字（"信息门户 邮箱 EN 首页..."）
  │            │  保留有效内容，添加metadata（source_url, category）
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 3. 文本切分 │  SentenceSplitter / MarkdownNodeParser
  │            │  chunk_size=512, chunk_overlap=50
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 4. 向量嵌入 │  DashScopeEmbedding(model="text-embedding-v3")
  │            │  1024维向量
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 5. 向量存储 │  FAISS VectorStore
  │            │  保存为 hhu_index.faiss + hhu_index.pkl
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 6. 索引构建 │  VectorStoreIndex
  │            │  可持久化加载
  └────────────┘

【问答查询阶段】（用户提问时执行）

  用户提问
     │
     ▼
  ┌────────────┐
  │ 1. 问题    │  接收用户问题 + conversation_id（可选）
  │ 预处理     │  加载多轮对话历史（如提供conversation_id）
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 2. 检索器  │  VectorIndexRetriever(similarity_top_k=5)
  │            │  FAISS相似度检索，返回Top5相关节点
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 3. 上下文  │  将检索结果拼接为上下文
  │ 构建       │  包含节点内容 + source_url metadata
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 4. Prompt  │  System Prompt + 上下文 + 用户问题
  │ 组装       │  要求回答简洁、中文、带引用标注
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 5. LLM生成 │  DashScope LLM (qwen-turbo)
  │            │  temperature=0.3, 流式输出
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 6. 后处理  │  提取来源引用，构建source卡片
  │            │  保存问答记录到SQLite
  └────────────┘
         │
         ▼
  ┌────────────┐
  │ 7. SSE返回 │  event: meta → token → done
  │            │  meta包含sources，token为流式文本
  └────────────┘
```

### 4.2 Prompt 工程

#### System Prompt

```
你是河海大学校园问答助手，专门回答关于河海大学的各类问题。

【回答要求】
1. 只根据提供的参考资料回答，资料不足时明确说明"根据现有资料，暂未找到相关信息"
2. 使用简洁、专业的中文回答
3. 在回答中引用资料来源，使用 [1]、[2] 等标注
4. 回答末尾可附上"如需了解更多，可访问河海大学官网：www.hhu.edu.cn"
5. 对于招生、录取等时效性问题，建议用户核实最新信息

【参考资料格式】
每段参考资料包含标题和内容，回答时请优先引用相关内容。
```

#### 上下文模板

```
【参考资料】
[1] {document_title_1}
{chunk_content_1}
来源：{source_url_1}

[2] {document_title_2}
{chunk_content_2}
来源：{source_url_2}

...

【用户问题】
{question}

【历史对话】（如有）
{conversation_history}
```

### 4.3 多轮对话实现

```python
# 使用 LlamaIndex ChatEngine 实现多轮对话
from llama_index.core.chat_engine import CondensePlusContextChatEngine

chat_engine = CondensePlusContextChatEngine.from_defaults(
    retriever=index.as_retriever(similarity_top_k=5),
    llm=dashscope_llm,
    memory=ChatMemoryBuffer(token_limit=3000),  # 维护对话历史
    system_prompt=SYSTEM_PROMPT,
)

# 每次对话时传入历史消息
response = chat_engine.chat(message=user_question, chat_history=history)
```

### 4.4 关键配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `chunk_size` | 512 | 文本切块大小（字符） |
| `chunk_overlap` | 50 | 切块重叠大小 |
| `similarity_top_k` | 5 | 检索返回Top5节点 |
| `embedding_model` | text-embedding-v3 | DashScope Embedding模型 |
| `embedding_dim` | 1024 | 向量维度 |
| `llm_model` | qwen-turbo | DashScope LLM模型 |
| `temperature` | 0.3 | LLM温度参数（较低，保证确定性） |
| `max_tokens` | 1024 | 最大生成token数 |
| `memory_token_limit` | 3000 | 多轮对话历史token上限 |

---

## 5. 数据库设计

### 5.1 ER 图

```
┌──────────────┐         ┌──────────────┐
│    users     │         │  documents   │
├──────────────┤         ├──────────────┤
│ PK id        │◄────────┤ FK uploaded_by│
│    name      │   1:N   │    title     │
│    email     │         │    filename  │
│    password_hash│       │    stored_name│
│    role      │         │    status    │
│    is_active │         │    chunk_count│
│    created_at│         │    created_at│
└──────────────┘         └──────────────┘
       │ 1
       │
       │ 1
       ▼
┌──────────────┐         ┌──────────────┐
│ conversations│◄────────┤   messages   │
├──────────────┤   1:N  ├──────────────┤
│ PK id        │         │ FK conversation_id│
│ FK user_id   │         │    role      │
│    title     │         │    content   │
│    created_at│         │    sources   │
│    updated_at│         │    created_at│
└──────────────┘         └──────────────┘
```

### 5.2 表结构

与现有实现保持一致（users, documents, conversations, messages），新增 `document_sources` 字段存储来源URL。

---

## 6. API 接口设计

### 6.1 接口概览

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 公开 | 健康检查 |
| POST | `/api/auth/register` | 公开 | 注册 |
| POST | `/api/auth/login` | 公开 | 登录 |
| GET | `/api/auth/me` | 登录 | 当前用户 |
| POST | `/api/chat/stream` | 登录 | **流式问答（核心）** |
| GET | `/api/conversations` | 登录 | 会话列表 |
| GET | `/api/conversations/{id}` | 登录 | 会话详情 |
| DELETE | `/api/conversations/{id}` | 登录 | 删除会话 |
| GET | `/api/documents` | 登录用户 | 分页文档列表、搜索与状态筛选 |
| POST | `/api/documents` | 登录用户 | 上传文档并进入异步处理队列 |
| PATCH | `/api/documents/{id}` | 登录用户 | 更新元数据并重建索引 |
| POST | `/api/documents/{id}/reprocess` | 登录用户 | 重新处理 |
| DELETE | `/api/documents/{id}` | 登录用户 | 删除文档、原文件及对应向量 |
| POST | `/api/search` | 登录用户 | 独立 TopK 向量检索 |
| GET | `/api/users` | 管理员 | 用户列表 |
| PATCH | `/api/users/{id}` | 管理员 | 更新用户 |
| GET | `/api/stats` | 管理员 | 系统统计 |

### 6.2 核心接口：流式问答

```http
POST /api/chat/stream
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "question": "河海大学的校训是什么？",
  "conversation_id": 123  // 可选，继续已有会话
}

Response: text/event-stream

# 1. 元数据事件（包含来源）
event: meta
data: {
  "conversation_id": 123,
  "sources": [
    {"document_id": 1, "title": "学校简介", "source_url": "https://www.hhu.edu.cn/xxjj_23318/list.htm", "score": 0.92},
    {"document_id": 2, "title": "大学章程", "source_url": "https://www.hhu.edu.cn/dxzc/list.htm", "score": 0.88}
  ]
}

# 2. 流式文本事件
event: token
data: {"text": "河海大学的校训是"}

event: token
data: {"text": "\"艰苦朴素"}

event: token
data: {"text": "、\"实事求是\"、\"严格要求\"、\"勇于探索\""}

...

# 3. 完成事件
event: done
data: {}
```

---

## 7. 前端架构设计

### 7.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 3.x | 样式框架 |
| Zustand | 5.x | 状态管理 |
| Lucide React | 最新 | 图标库 |

### 7.2 组件结构

```
App
├── ChatWidget（浮动问答机器人 - 主入口）
│   ├── ChatBubble（浮动气泡）
│   │   └── 机器人图标 + 未读红点
│   └── ChatWindow（聊天窗口）
│       ├── ChatHeader（顶部栏）
│       │   ├── 标题"河海问答助手"
│       │   ├── 收起/关闭按钮
│       │   └── 新会话按钮
│       ├── ChatSidebar（侧边栏 - 可选）
│       │   └── ConversationList（历史会话列表）
│       ├── MessageArea（消息区域）
│       │   ├── WelcomeMessage（欢迎消息 + 快捷问题）
│       │   ├── UserMessage（用户消息气泡）
│       │   └── AssistantMessage（AI消息气泡）
│       │       ├── MessageContent（Markdown渲染）
│       │       └── SourceCitations（来源引用卡片）
│       │           └── SourceCard（单条来源：标题+链接）
│       └── ChatInput（输入区域）
│           ├── TextInput（文本输入框）
│           ├── SendButton（发送按钮）
│           └── QuickQuestions（快捷问题按钮组）
│
└── WorkspaceApp（校园知识工作台 - 独立路由）
    ├── LoginPage
    ├── DashboardPage
    ├── DocumentsPage
    └── UsersPage
```

### 7.3 河海大学风格UI

#### 配色方案（从官网提取）

| 用途 | 颜色 | Hex |
|------|------|-----|
| 主色（河海蓝） | 河海大学标准蓝 | `#005BAC` |
| 主色hover | 深蓝 | `#004A8D` |
| 背景色 | 浅灰白 | `#F5F7FA` |
| 用户消息气泡 | 河海蓝 | `#005BAC` |
| AI消息气泡 | 白色 | `#FFFFFF` |
| 边框 | 浅灰 | `#E5E7EB` |
| 文字主色 | 深灰 | `#1F2937` |
| 文字次要 | 中灰 | `#6B7280` |
| 引用来源 | 浅蓝背景 | `#EBF4FF` |
| 未读红点 | 红色 | `#EF4444` |

#### 浮动气泡样式

```css
/* 浮动气泡 */
.chat-bubble {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #005BAC;
  box-shadow: 0 4px 12px rgba(0, 91, 172, 0.3);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 9999;
}

.chat-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 91, 172, 0.4);
}

/* 聊天窗口 */
.chat-window {
  position: fixed;
  right: 24px;
  bottom: 88px;
  width: 400px;
  height: 600px;
  max-height: calc(100vh - 120px);
  border-radius: 16px;
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 9998;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .chat-window {
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
}
```

---

## 8. 门户嵌入方案

### 8.1 嵌入方式

提供一段 `<script>` 标签，河海大学官网管理员只需在页面模板中添加即可：

```html
<!-- 嵌入河海大学问答助手 -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://hhu-qa.example.com/widget.js';
    script.async = true;
    script.onload = function() {
      window.HHUChat.init({
        apiBaseUrl: 'https://hhu-qa-api.example.com',
        position: 'right-bottom',  // 位置：right-bottom / left-bottom
        primaryColor: '#005BAC',    // 河海蓝
        welcomeMessage: '你好！我是河海大学问答助手，请问有什么可以帮到你？',
        quickQuestions: [
          '学校简介',
          '图书馆开放时间',
          '奖学金申请',
          '校园卡补办'
        ]
      });
    };
    document.head.appendChild(script);
  })();
</script>
```

### 8.2 嵌入脚本架构

```
widget.js（UMD格式，兼容各种页面）
├── 动态加载 React + ChatWidget 组件
├── 创建 Shadow DOM（样式隔离，不影响宿主页面）
├── 渲染浮动气泡 + 聊天窗口
├── 处理跨域通信（CORS）
└── 支持配置参数覆盖
```

### 8.3 Shadow DOM 隔离

使用 Shadow DOM 技术确保问答助手样式不污染河海大学官网：

```javascript
const host = document.createElement('div');
host.id = 'hhu-chat-widget-host';
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: 'open' });

// 注入样式
const style = document.createElement('style');
style.textContent = /* Tailwind生成的CSS */ '';
shadow.appendChild(style);

// 渲染React组件
const root = document.createElement('div');
shadow.appendChild(root);
ReactDOM.createRoot(root).render(<ChatWidget />);
```

---

## 9. 部署架构

### 9.1 开发环境

```
┌─────────────────────────────────────────┐
│              开发环境                    │
│  ┌─────────────┐    ┌─────────────┐    │
│  │ 前端 :5173  │    │ 后端 :8000  │    │
│  │ Vite dev    │    │ Uvicorn     │    │
│  │             │    │ reload      │    │
│  └─────────────┘    └─────────────┘    │
│         │                  │            │
│         └────── CORS ──────┘            │
│                                         │
│  SQLite: backend/data/campus_qa.db      │
│  FAISS:  backend/data/hhu_index.faiss   │
│  Uploads: backend/data/uploads/         │
└─────────────────────────────────────────┘
```

### 9.2 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DASHSCOPE_API_KEY` | 阿里云百炼API密钥 | `sk-xxx...` |
| `LLM_MODEL` | LLM模型名称 | `qwen-turbo` |
| `EMBEDDING_MODEL` | Embedding模型 | `text-embedding-v3` |
| `DATABASE_PATH` | SQLite数据库路径 | `/app/data/campus_qa.db` |
| `KNOWLEDGE_BASE_DIR` | 知识库目录 | `../knowledge-base` |
| `APP_SECRET` | JWT密钥 | 随机字符串 |
| `FRONTEND_ORIGIN` | 前端域名 | `https://www.hhu.edu.cn` |

---

## 10. 实训课程对应

### 与原课程表对照

| 原天数 | 原内容 | 河海版调整 |
|--------|--------|-----------|
| Day1 | 项目认知、环境搭建 | 增加：LlamaIndex安装、DashScope配置、河海知识库导入 |
| Day2 | 数据库设计、脚手架 | 增加：FAISS向量库设计、前端浮动组件架构 |
| Day3 | 用户模块、登录认证 | 不变，但UI适配河海风格 |
| Day4 | 知识库模块 | **重点**：LlamaIndex索引构建、文档清洗、向量化 |
| Day5 | RAG核心、AI模块 | **重点**：DashScope集成、多轮对话、SSE流式 |
| Day6 | 测试发布 | **重点**：门户嵌入脚本、Shadow DOM、部署上线 |

### 实训产出物

| 产出 | 说明 |
|------|------|
| 后端API服务 | FastAPI + LlamaIndex + DashScope |
| 浮动问答组件 | React + 河海蓝风格 + Shadow DOM |
| 校园知识工作台 | 问答、全员知识库管理；管理员额外维护用户与权限 |
| 嵌入脚本 | `widget.js` 可嵌入官网任意页面 |
| 运行文档 | 本地环境配置与启动说明 |
| 项目报告 | 架构设计、技术选型、实现过程 |

---

## 附录：关键代码片段

### A. LlamaIndex 引擎初始化

```python
from llama_index.core import Settings, VectorStoreIndex
from llama_index.embeddings.dashscope import DashScopeEmbedding
from llama_index.llms.dashscope import DashScope
from llama_index.vector_stores.faiss import FaissVectorStore
import faiss

# 配置全局Settings
Settings.embed_model = DashScopeEmbedding(
    model_name="text-embedding-v3",
    api_key=os.environ["DASHSCOPE_API_KEY"]
)
Settings.llm = DashScope(
    model_name="qwen-turbo",
    api_key=os.environ["DASHSCOPE_API_KEY"]
)

# 创建FAISS向量存储
dimension = 1024  # text-embedding-v3
faiss_index = faiss.IndexFlatIP(dimension)  # 内积（余弦相似度）
vector_store = FaissVectorStore(faiss_index=faiss_index)

# 加载文档并构建索引
from llama_index.core import SimpleDirectoryReader, StorageContext

documents = SimpleDirectoryReader("knowledge-base").load_data()
storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)

# 保存索引
index.storage_context.persist(persist_dir="./storage")
```

### B. 多轮对话查询

```python
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.core.memory import ChatMemoryBuffer

# 创建检索器
retriever = index.as_retriever(similarity_top_k=5)

# 创建聊天引擎
chat_engine = CondensePlusContextChatEngine.from_defaults(
    retriever=retriever,
    memory=ChatMemoryBuffer(token_limit=3000),
    system_prompt=SYSTEM_PROMPT,
    verbose=True,
)

# 流式输出
response = chat_engine.stream_chat(message=user_question)
for token in response.response_gen:
    yield token
```

### C. 文档清洗（去除导航文字）

```python
import re
from llama_index.core import Document

def clean_hhu_document(text: str, metadata: dict) -> str:
    """清洗河海大学文档，去除导航文字"""
    # 导航关键词列表
    nav_keywords = [
        "信息门户", "邮箱", "EN", "首页", "学校概况", "学校简介",
        "大学章程", "历史名人", "历任党政负责人", "现任领导",
        "院系部门", "院系设置", "党政职能部门", "群团组织",
        "派出机构", "直属单位", "科学研究", "科研动态",
        "学术会议", "科研机构", "科研成果", "学术期刊",
        "管理部门", "信息公告", "教育教学", "师资队伍",
        "本科生培养", "研究生培养", "留学生培养", "终身教育",
        "人才招聘", "招生就业", "本科生招生", "研究生招生",
        "留学生招生", "就业指导"
    ]
    
    # 去除连续出现的导航文字（通常出现在文档开头）
    lines = text.split('\n')
    cleaned_lines = []
    nav_streak = 0
    
    for line in lines:
        stripped = line.strip()
        if stripped in nav_keywords:
            nav_streak += 1
            if nav_streak <= 3:  # 允许前3个导航词保留（可能是正文内容）
                cleaned_lines.append(line)
        else:
            nav_streak = 0
            cleaned_lines.append(line)
    
    # 如果前20行中超过80%是导航词，则去除前20行
    if len(lines) > 20:
        first_20 = [l.strip() for l in lines[:20]]
        nav_count = sum(1 for l in first_20 if l in nav_keywords)
        if nav_count / len(first_20) > 0.5:
            cleaned_lines = lines[20:]
    
    return '\n'.join(cleaned_lines).strip()
```

---

*文档结束 — 河海大学校园问答助手 v2.0*
