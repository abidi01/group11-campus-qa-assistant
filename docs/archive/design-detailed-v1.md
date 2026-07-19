# 校园问答助手 — 细化需求与架构设计文档

> 版本：v1.1（细化版）
> 日期：2026-07-01
> 基于：已有 FastAPI 后端实现 + 课程表需求

---

## 目录

1. [需求细化](#1-需求细化)
   - 1.1 [用户画像与角色](#11-用户画像与角色)
   - 1.2 [用户故事（User Stories）](#12-用户故事user-stories)
   - 1.3 [用例分析（Use Cases）](#13-用例分析use-cases)
   - 1.4 [功能需求细化](#14-功能需求细化)
   - 1.5 [非功能需求细化](#15-非功能需求细化)
2. [系统架构设计](#2-系统架构设计)
   - 2.1 [总体架构](#21-总体架构)
   - 2.2 [分层架构](#22-分层架构)
   - 2.3 [模块划分](#23-模块划分)
   - 2.4 [数据流设计](#24-数据流设计)
3. [数据库详细设计](#3-数据库详细设计)
   - 3.1 [ER 图](#31-er-图)
   - 3.2 [表结构详细定义](#32-表结构详细定义)
   - 3.3 [索引策略](#33-索引策略)
4. [API 接口详细设计](#4-api-接口详细设计)
5. [前端架构设计](#5-前端架构设计)
6. [RAG 流程详细设计](#6-rag-流程详细设计)
7. [安全架构设计](#7-安全架构设计)
8. [部署架构设计](#8-部署架构设计)

---

## 1. 需求细化

### 1.1 用户画像与角色

| 角色 | 描述 | 权限范围 |
|------|------|----------|
| **学生（STUDENT）** | 校园问答系统的主要使用者，需要查询校园知识、进行问答交互 | 注册/登录、发起问答、查看个人历史会话、修改个人信息 |
| **管理员（ADMIN）** | 系统维护者，负责知识库管理和用户管理 | 学生所有权限 + 文档上传/管理、用户角色管理、查看系统统计 |
| **访客（VISITOR）** | 未登录用户 | 仅可浏览登录/注册页面 |

### 1.2 用户故事（User Stories）

#### US-001: 学生注册
> 作为访客，我希望通过邮箱注册账号，以便使用问答服务。

- **验收标准**:
  - 注册表单包含：姓名（2-40字符）、邮箱（有效格式）、密码（6-72字符）
  - 邮箱唯一性校验，重复邮箱返回 409
  - 注册成功后自动创建 STUDENT 角色账号，返回 JWT Token
  - 密码使用 PBKDF2-SHA256 加密存储，16字节随机 salt，210000轮迭代

#### US-002: 学生登录
> 作为学生，我希望通过邮箱和密码登录，以便访问个人问答历史。

- **验收标准**:
  - 登录成功后返回 JWT Token（HS256，24小时有效期）
  - 密码错误返回 401，账号被禁用返回 403
  - Token 包含用户ID和角色信息

#### US-003: 智能问答
> 作为学生，我希望向系统提问并获得基于校园知识库的准确回答，同时能看到答案来源。

- **验收标准**:
  - 支持新建会话或继续已有会话提问
  - 系统自动检索知识库中 TopK 相关文档片段
  - 回答包含来源引用标记（如 [1]、[2]）
  - 使用 DashScope API 完成向量化、知识检索与大模型回答
  - 问答记录自动保存到会话历史中
  - 支持 SSE 流式输出，提升用户体验

#### US-004: 问答历史管理
> 作为学生，我希望查看和删除之前的问答会话，以便管理个人记录。

- **验收标准**:
  - 会话列表按更新时间倒序排列
  - 显示会话标题（首条问题前28字符）和消息数量
  - 支持查看会话详情（完整问答记录）
  - 支持删除个人会话（级联删除关联消息）

#### US-005: 文档上传（管理员）
> 作为管理员，我希望上传校园相关文档到知识库，以便学生查询。

- **验收标准**:
  - 支持格式：TXT、Markdown、PDF、DOCX
  - 文件大小限制：10MB
  - 上传后自动解析、切分、向量化并入库
  - 显示文档处理状态（PROCESSING / READY / ERROR）
  - 支持重新处理已有文档
  - 支持删除文档（同步清理向量数据）

#### US-006: 用户管理（管理员）
> 作为管理员，我希望查看和管理所有用户，以便维护系统秩序。

- **验收标准**:
  - 用户列表按注册时间倒序排列
  - 支持修改用户角色（STUDENT/ADMIN）
  - 支持启用/禁用用户账号
  - 禁止管理员禁用自己

#### US-007: 系统统计
> 作为管理员，我希望查看系统运行状态，以便了解知识库规模。

- **验收标准**:
  - 显示就绪文档数量
  - 显示文档切块总数
  - 显示会话总数

### 1.3 用例分析（Use Cases）

```
┌─────────────────────────────────────────────────────────────────┐
│                        校园问答助手系统                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   访客      │    │   学生      │    │  管理员     │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │                │
│         │ 注册账号         │ 登录/退出        │ 登录           │
│         │ 浏览登录页       │ 发起问答         │ 上传文档       │
│         │                  │ 查看历史会话     │ 管理文档       │
│         │                  │ 删除会话         │ 管理用户       │
│         │                  │ 查看个人信息     │ 查看统计       │
│         │                  │                  │ 重新处理文档   │
│         ▼                  ▼                  ▼                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    系统核心功能                           │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │
│  │  │认证模块 │ │问答模块 │ │知识库   │ │用户管理 │       │  │
│  │  │         │ │         │ │模块     │ │         │       │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 功能需求细化

#### 1.4.1 认证模块（Authentication）

| 功能点 | 需求描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| 用户注册 | 邮箱+密码注册，邮箱唯一校验 | P0 | ✅ 已实现 |
| 用户登录 | 邮箱+密码登录，返回 JWT | P0 | ✅ 已实现 |
| 获取当前用户 | 根据 Token 获取用户信息 | P0 | ✅ 已实现 |
| Token 刷新 | 支持 Token 自动刷新机制 | P1 | ⬜ 待实现 |
| 密码重置 | 支持通过邮箱重置密码 | P2 | ⬜ 待实现 |

#### 1.4.2 问答模块（Chat）

| 功能点 | 需求描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| 流式问答 | SSE 流式返回回答内容 | P0 | ✅ 已实现 |
| 来源引用 | 回答中包含来源文档引用 | P0 | ✅ 已实现 |
| 新建会话 | 首次提问自动创建会话 | P0 | ✅ 已实现 |
| 继续会话 | 指定 conversation_id 继续对话 | P0 | ✅ 已实现 |
| 会话列表 | 查看个人所有会话 | P0 | ✅ 已实现 |
| 会话详情 | 查看会话完整问答记录 | P0 | ✅ 已实现 |
| 删除会话 | 删除个人会话及关联消息 | P0 | ✅ 已实现 |
| 多轮对话 | 支持上下文关联的多轮对话 | P1 | ⬜ 待实现 |
| 会话重命名 | 支持修改会话标题 | P2 | ⬜ 待实现 |

#### 1.4.3 知识库模块（Knowledge Base）

| 功能点 | 需求描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| 文档上传 | 支持多格式文档上传 | P0 | ✅ 已实现 |
| 文档列表 | 查看所有已上传文档 | P0 | ✅ 已实现 |
| 文档重新处理 | 重新解析、切分、向量化 | P0 | ✅ 已实现 |
| 文档删除 | 删除文档及关联向量 | P0 | ✅ 已实现 |
| 文档搜索 | 按名称搜索文档 | P1 | ⬜ 待实现 |
| 批量上传 | 支持多文件同时上传 | P1 | ⬜ 待实现 |
| 文档预览 | 在线预览文档内容 | P2 | ⬜ 待实现 |

#### 1.4.4 用户管理模块（User Management）

| 功能点 | 需求描述 | 优先级 | 状态 |
|--------|----------|--------|------|
| 用户列表 | 查看所有注册用户 | P0 | ✅ 已实现 |
| 角色修改 | 修改用户角色 | P0 | ✅ 已实现 |
| 状态管理 | 启用/禁用用户 | P0 | ✅ 已实现 |
| 用户搜索 | 按姓名/邮箱搜索 | P1 | ⬜ 待实现 |
| 批量操作 | 批量启用/禁用 | P2 | ⬜ 待实现 |

### 1.5 非功能需求细化

#### 1.5.1 性能需求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 问答响应时间 | ≤ 3秒 | 从提交问题到首字返回 |
| 页面加载时间 | ≤ 2秒 | 首屏加载完成 |
| 并发用户数 | ≥ 50 | 同时在线用户 |
| 文档处理速度 | ≥ 1页/秒 | 文档解析切分向量化 |

#### 1.5.2 安全需求

| 需求 | 实现方式 |
|------|----------|
| 密码安全 | PBKDF2-SHA256 + 随机 Salt + 210000轮 |
| 传输安全 | HTTPS（生产环境） |
| 身份认证 | JWT Token（HS256，24小时过期） |
| 权限控制 | 基于角色的访问控制（RBAC） |
| 输入验证 | Pydantic 模型校验 + SQL 参数化查询 |
| 文件上传 | 白名单扩展名 + 大小限制 + 随机存储名 |
| CORS 控制 | 只允许前端域名访问 |

#### 1.5.3 可用性需求

| 需求 | 说明 |
|------|------|
| 联网要求 | 本地演示需要可访问 DashScope API |
| 错误提示 | 所有错误操作返回明确的中文错误信息 |
| 响应式设计 | 支持桌面端和移动端适配 |
| 加载状态 | 上传、处理等耗时操作显示进度/加载状态 |

#### 1.5.4 可扩展性需求

| 需求 | 说明 |
|------|------|
| 向量模型替换 | 当前使用确定性哈希向量，可替换为 Embedding 模型 |
| LLM 接入扩展 | 支持任意 OpenAI 兼容 API |
| 数据库迁移 | SQLite 可平滑迁移至 PostgreSQL/MySQL |
| 文档格式扩展 | 可扩展支持更多文档格式 |

---

## 2. 系统架构设计

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    React 19 + TypeScript + Vite SPA                     │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │ │
│  │  │ 登录页  │ │ 注册页  │ │ 聊天页  │ │ 文档管理│ │ 用户管理│         │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ HTTP/REST + SSE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API 网关层                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      FastAPI + Uvicorn + CORS                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │ 认证中间件  │  │ 权限中间件  │  │ 日志中间件  │  │ 异常处理   │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              业务服务层                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │ │
│  │   │  认证服务    │   │  问答服务    │   │  知识库服务  │             │ │
│  │   │  AuthService │   │  ChatService │   │  DocService  │             │ │
│  │   └──────────────┘   └──────────────┘   └──────────────┘             │ │
│  │                                                                         │ │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │ │
│  │   │  用户服务    │   │  RAG 服务    │   │  统计服务    │             │ │
│  │   │  UserService │   │  RAGService  │   │ StatsService │             │ │
│  │   └──────────────┘   └──────────────┘   └──────────────┘             │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│      数据持久层           │ │   向量检索层     │ │      外部服务层          │
│  ┌─────────────────────┐ │ ┌─────────────┐   │ ┌─────────────────────┐   │
│  │    SQLite           │ │ │  内存向量     │   │ │  OpenAI 兼容 API    │   │
│  │  ┌───────────────┐  │ │ │  (JSON 存储) │   │ │  ┌───────────────┐  │   │
│  │  │ users         │  │ │ └─────────────┘   │ │  │ LLM 生成       │  │   │
│  │  │ documents     │  │ │                   │ │  │ Embedding      │  │   │
│  │  │ chunks        │  │ │                   │ │  └───────────────┘  │   │
│  │  │ conversations │  │ │                   │ │                     │   │
│  │  │ messages      │  │ │                   │ │                     │   │
│  │  └───────────────┘  │ │                   │ └─────────────────────┘   │
│  └─────────────────────┘ │                   └─────────────────────────┘
└─────────────────────────┘
```

### 2.2 分层架构

采用 **四层架构** 模式：

| 层级 | 职责 | 对应代码 |
|------|------|----------|
| **表现层（Presentation）** | 前端页面、路由、UI 组件 | `frontend/src/` |
| **应用层（Application）** | API 路由、请求处理、DTO 定义 | `backend/app/main.py` |
| **领域层（Domain）** | 业务逻辑、RAG 核心、安全认证 | `backend/app/rag.py`, `security.py` |
| **基础设施层（Infrastructure）** | 数据库、文件存储、外部 API | `backend/app/database.py`, `config.py` |

### 2.3 模块划分

#### 后端模块结构（建议重构）

```
backend/app/
├── __init__.py
├── config.py              # 配置管理（不变）
├── database.py            # 数据库连接与 Schema（不变）
├── security.py            # 安全工具（不变）
├── rag.py               # RAG 核心（不变）
├── main.py              # FastAPI 应用入口（精简）
├── routers/             # 路由模块（新增）
│   ├── __init__.py
│   ├── auth.py          # 认证路由
│   ├── chat.py          # 问答路由
│   ├── documents.py     # 文档路由
│   ├── users.py         # 用户路由
│   └── stats.py         # 统计路由
├── services/            # 业务服务层（新增）
│   ├── __init__.py
│   ├── auth_service.py
│   ├── chat_service.py
│   ├── document_service.py
│   └── user_service.py
├── models/              # 数据模型/Pydantic DTO（新增）
│   ├── __init__.py
│   ├── auth.py
│   ├── chat.py
│   ├── document.py
│   └── user.py
└── middleware/            # 自定义中间件（新增）
    ├── __init__.py
    ├── auth.py
    └── error.py
```

#### 前端模块结构（待实现）

```
frontend/
├── public/                  # 静态资源
├── src/
│   ├── main.tsx             # 应用入口
│   ├── App.tsx              # 根组件
│   ├── routes.tsx           # 路由配置
│   ├── api/                 # API 客户端
│   │   ├── client.ts        # axios/fetch 封装
│   │   ├── auth.ts          # 认证接口
│   │   ├── chat.ts          # 问答接口
│   │   ├── documents.ts     # 文档接口
│   │   └── users.ts         # 用户接口
│   ├── components/          # 公共组件
│   │   ├── Layout.tsx       # 页面布局
│   │   ├── Sidebar.tsx      # 侧边导航
│   │   ├── Header.tsx       # 顶部栏
│   │   ├── Loading.tsx      # 加载状态
│   │   └── ErrorBoundary.tsx # 错误边界
│   ├── pages/               # 页面组件
│   │   ├── Login.tsx        # 登录页
│   │   ├── Register.tsx     # 注册页
│   │   ├── Chat.tsx         # 聊天页
│   │   ├── Documents.tsx    # 文档管理页
│   │   ├── Users.tsx        # 用户管理页
│   │   └── Dashboard.tsx    # 统计仪表盘
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAuth.ts       # 认证状态
│   │   ├── useChat.ts       # 聊天状态
│   │   └── useSSE.ts        # SSE 流式处理
│   ├── stores/              # 状态管理
│   │   └── authStore.ts     # 认证状态（Zustand）
│   ├── types/               # TypeScript 类型
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   └── document.ts
│   └── utils/               # 工具函数
│       ├── format.ts        # 格式化
│       └── storage.ts       # 本地存储
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 2.4 数据流设计

#### 2.4.1 用户认证数据流

```
┌────────┐     注册/登录表单      ┌────────┐     验证密码      ┌────────┐
│ 前端   │ ───────────────────> │ API    │ ──────────────> │ 安全模块 │
│        │                      │        │                 │        │
│        │ <─────────────────── │        │ <────────────── │        │
│        │    JWT Token         │        │   Token 生成    │        │
└────────┘                      └────────┘                 └────────┘
   │                                 │
   │ 存储 Token                      │ 后续请求携带
   ▼                                 ▼
┌────────┐     携带 Token          ┌────────┐     验证 Token    ┌────────┐
│ local  │ ───────────────────>    │ 受保护 │ ──────────────> │ 安全模块 │
│Storage │                         │ 接口   │                 │        │
└────────┘                         └────────┘                 └────────┘
```

#### 2.4.2 问答数据流

```
┌────────┐    提问              ┌────────┐    检索向量      ┌────────┐
│ 用户   │ ──────────────────> │ 问答   │ ──────────────> │ 向量库 │
│        │                     │ 接口   │                 │        │
│        │ <────────────────── │        │ <────────────── │        │
│        │   SSE 流式回答      │        │   TopK 结果     │        │
└────────┘                     └────────┘                 └────────┘
                                    │
                                    │ 调用 LLM / 本地摘要
                                    ▼
                              ┌────────┐
                              │ LLM    │
                              │ API    │
                              └────────┘
                                    │
                                    ▼
                              ┌────────┐
                              │ 保存   │
                              │ 记录   │
                              └────────┘
```

#### 2.4.3 文档处理数据流

```
┌────────┐    上传文档           ┌────────┐    保存文件       ┌────────┐
│ 管理员 │ ──────────────────> │ 文档   │ ──────────────> │ 文件   │
│        │                     │ 接口   │                 │ 系统   │
│        │ <────────────────── │        │ <────────────── │        │
│        │   处理状态          │        │   返回存储名    │        │
└────────┘                     └────────┘                 └────────┘
                                    │
                                    │ 异步/同步处理
                                    ▼
                              ┌────────┐
                              │ 文档   │
                              │ 处理   │
                              │ 流程   │
                              └────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌────────┐    ┌────────┐    ┌────────┐
              │ 文本   │    │ 文本   │    │ 向量   │
              │ 提取   │ -> │ 切分   │ -> │ 嵌入   │
              └────────┘    └────────┘    └────────┘
                                                  │
                                                  ▼
                                            ┌────────┐
                                            │ 数据   │
                                            │ 入库   │
                                            └────────┘
```

---

## 3. 数据库详细设计

### 3.1 ER 图

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │         │  documents   │         │   chunks     │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ PK id        │◄────────┤ FK uploaded_by│         │ FK document_id│
│    name      │   1:N   │    title     │◄────────┤    chunk_index│
│    email     │         │    filename  │   1:N   │    content   │
│    password_hash│       │    stored_name│        │    vector    │
│    role      │         │    mime_type │         └──────────────┘
│    is_active │         │    size      │
│    created_at│         │    status    │
└──────────────┘         │    chunk_count│
       │ 1                │    error     │
       │                  │    created_at│
       │                  │    updated_at│
       │                  └──────────────┘
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

**关系说明**：
- `users` 1:N `documents` — 一个用户可上传多个文档
- `users` 1:N `conversations` — 一个用户可有多个会话
- `documents` 1:N `chunks` — 一个文档可切分为多个文本块
- `conversations` 1:N `messages` — 一个会话包含多条消息

### 3.2 表结构详细定义

#### 3.2.1 users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 用户姓名 |
| email | TEXT | NOT NULL, UNIQUE | 邮箱（登录账号） |
| password_hash | TEXT | NOT NULL | 加密密码 |
| role | TEXT | NOT NULL, DEFAULT 'STUDENT', CHECK(role IN ('STUDENT', 'ADMIN')) | 角色 |
| is_active | INTEGER | NOT NULL, DEFAULT 1 | 是否启用（1=启用, 0=禁用） |
| created_at | TEXT | NOT NULL | 创建时间（ISO 8601） |

#### 3.2.2 documents（文档表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| title | TEXT | NOT NULL | 文档标题 |
| filename | TEXT | NOT NULL | 原始文件名 |
| stored_name | TEXT | NOT NULL | 存储文件名（UUID） |
| mime_type | TEXT | NOT NULL | MIME 类型 |
| size | INTEGER | NOT NULL | 文件大小（字节） |
| status | TEXT | NOT NULL, DEFAULT 'PROCESSING', CHECK(status IN ('PROCESSING', 'READY', 'ERROR')) | 处理状态 |
| chunk_count | INTEGER | NOT NULL, DEFAULT 0 | 切块数量 |
| error | TEXT | NULL | 错误信息 |
| uploaded_by | INTEGER | NOT NULL, FK → users.id | 上传者ID |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

#### 3.2.3 chunks（文档切块表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| document_id | INTEGER | NOT NULL, FK → documents.id ON DELETE CASCADE | 所属文档ID |
| chunk_index | INTEGER | NOT NULL | 切块序号 |
| content | TEXT | NOT NULL | 切块内容 |
| vector | TEXT | NOT NULL | 序列化向量（JSON 数组） |

#### 3.2.4 conversations（会话表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| user_id | INTEGER | NOT NULL, FK → users.id ON DELETE CASCADE | 用户ID |
| title | TEXT | NOT NULL | 会话标题（首问前28字符） |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

#### 3.2.5 messages（消息表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| conversation_id | INTEGER | NOT NULL, FK → conversations.id ON DELETE CASCADE | 会话ID |
| role | TEXT | NOT NULL, CHECK(role IN ('USER', 'ASSISTANT')) | 消息角色 |
| content | TEXT | NOT NULL | 消息内容 |
| sources | TEXT | NOT NULL, DEFAULT '[]' | 来源引用（JSON 数组） |
| created_at | TEXT | NOT NULL | 创建时间 |

### 3.3 索引策略

```sql
-- 已有索引
CREATE INDEX idx_chunks_document ON chunks(document_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- 建议新增索引
CREATE INDEX idx_users_email ON users(email);          -- 登录查询优化
CREATE INDEX idx_users_role ON users(role);            -- 角色筛选优化
CREATE INDEX idx_documents_status ON documents(status); -- 状态筛选优化
CREATE INDEX idx_documents_uploader ON documents(uploaded_by); -- 上传者查询
CREATE INDEX idx_conversations_updated ON conversations(updated_at); -- 排序优化
```

---

## 4. API 接口详细设计

### 4.1 接口概览

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 公开 | 健康检查 |
| POST | `/api/auth/register` | 公开 | 用户注册 |
| POST | `/api/auth/login` | 公开 | 用户登录 |
| GET | `/api/auth/me` | 登录用户 | 当前用户信息 |
| GET | `/api/stats` | 登录用户 | 系统统计 |
| GET | `/api/documents` | 管理员 | 文档列表 |
| POST | `/api/documents` | 管理员 | 上传文档 |
| POST | `/api/documents/{id}/reprocess` | 管理员 | 重新处理 |
| DELETE | `/api/documents/{id}` | 管理员 | 删除文档 |
| POST | `/api/chat/stream` | 登录用户 | 流式问答 |
| GET | `/api/conversations` | 登录用户 | 会话列表 |
| GET | `/api/conversations/{id}` | 登录用户 | 会话详情 |
| DELETE | `/api/conversations/{id}` | 登录用户 | 删除会话 |
| GET | `/api/users` | 管理员 | 用户列表 |
| PATCH | `/api/users/{id}` | 管理员 | 更新用户 |

### 4.2 详细接口定义

#### 4.2.1 健康检查

```http
GET /api/health

Response 200:
{
  "status": "ok",
  "mode": "llm" | "local"
}
```

#### 4.2.2 用户注册

```http
POST /api/auth/register
Content-Type: application/json

Request:
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "123456"
}

Response 201:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "name": "张三",
    "email": "zhangsan@example.com",
    "role": "STUDENT",
    "is_active": true,
    "created_at": "2026-07-01T10:00:00+00:00"
  }
}

Response 409:
{
  "detail": "该邮箱已注册"
}
```

#### 4.2.3 用户登录

```http
POST /api/auth/login
Content-Type: application/json

Request:
{
  "email": "zhangsan@example.com",
  "password": "123456"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}

Response 401:
{
  "detail": "邮箱或密码错误"
}
```

#### 4.2.4 流式问答

```http
POST /api/chat/stream
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "question": "宿舍几点关门？",
  "conversation_id": null  // 可选，继续已有会话
}

Response: text/event-stream

event: meta
data: {"conversation_id": 1, "sources": [...]}

event: token
data: {"text": "根据"}

event: token
data: {"text": "校园服务"}

...

event: done
data: {}
```

#### 4.2.5 文档上传

```http
POST /api/documents
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- title: "宿舍管理规定"
- file: <binary>

Response 201:
{
  "id": 3,
  "title": "宿舍管理规定",
  "filename": "dorm.pdf",
  "stored_name": "a1b2c3d4.pdf",
  "mime_type": "application/pdf",
  "size": 102400,
  "status": "READY",
  "chunk_count": 12,
  "error": null,
  "uploaded_by": 1,
  "created_at": "2026-07-01T10:00:00+00:00",
  "updated_at": "2026-07-01T10:00:05+00:00"
}
```

---

## 5. 前端架构设计

### 5.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 3.x | 样式框架 |
| React Router | 7.x | 路由管理 |
| Zustand | 5.x | 状态管理 |
| Axios | 1.x | HTTP 客户端 |
| Lucide React | 最新 | 图标库 |

### 5.2 页面路由

| 路由 | 页面 | 权限 | 说明 |
|------|------|------|------|
| `/login` | 登录页 | 公开 | 邮箱+密码登录 |
| `/register` | 注册页 | 公开 | 新用户注册 |
| `/` | 聊天页 | 登录用户 | 首页，问答主界面 |
| `/chat/:id` | 会话页 | 登录用户 | 指定会话问答 |
| `/documents` | 文档管理 | 管理员 | 知识库文档管理 |
| `/users` | 用户管理 | 管理员 | 用户列表管理 |
| `/dashboard` | 统计仪表盘 | 管理员 | 系统统计信息 |

### 5.3 组件结构

```
App
├── AuthProvider (Zustand)
├── Router
│   ├── PublicLayout
│   │   ├── LoginPage
│   │   └── RegisterPage
│   └── ProtectedLayout
│       ├── Sidebar
│       ├── Header
│       ├── ChatPage
│       │   ├── ConversationList
│       │   ├── ChatWindow
│       │   │   ├── MessageList
│       │   │   │   ├── UserMessage
│       │   │   │   └── AssistantMessage (含 SourceCitations)
│       │   │   └── ChatInput
│       │   └── NewChatButton
│       ├── DocumentsPage
│       │   ├── DocumentUploader
│       │   └── DocumentTable
│       ├── UsersPage
│       │   └── UserTable
│       └── DashboardPage
│           └── StatsCards
```

### 5.4 状态管理

```typescript
// 认证状态
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// 聊天状态
interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (question: string, conversationId?: number) => void;
  loadConversations: () => void;
  loadMessages: (conversationId: number) => void;
}
```

---

## 6. RAG 流程详细设计

### 6.1 核心流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAG 问答流程                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  用户提问
     │
     ▼
┌────────────┐
│ 1. 问题    │  对问题进行向量化（embed）
│ 向量化     │  使用确定性哈希词袋模型（384维）
└────────────┘
     │
     ▼
┌────────────┐
│ 2. 向量    │  在 chunks 表中计算余弦相似度
│ 检索       │  排序取 TopK（默认 limit=4）
└────────────┘
     │
     ▼
┌────────────┐
│ 3. 相关度  │  动态阈值过滤：max(0.12, best_score * 0.65)
│ 过滤       │  确保返回结果质量
└────────────┘
     │
     ▼
┌────────────┐
│ 4. 上下文  │  将 TopK 结果拼接为上下文
│ 构建       │  格式：[1] 文档标题\n内容\n\n[2] ...
└────────────┘
     │
     ▼
┌────────────┐     ┌────────────┐
│ 5. 答案    │ --> │ LLM API    │  有 API Key 时调用大模型
│ 生成       │     │ (可选)     │  使用 System Prompt 约束回答
└────────────┘     └────────────┘
     │
     │ 无 API Key 时
     ▼
┌────────────┐
│ 本地检索   │  拼接前3条相关 chunk 作为摘要回答
│ 摘要       │  明确标注"来自已收录资料"
└────────────┘
     │
     ▼
┌────────────┐
│ 6. 结果    │  SSE 流式返回
│ 返回       │  包含来源引用和 conversation_id
└────────────┘
     │
     ▼
┌────────────┐
│ 7. 记录    │  保存问答记录到 messages 表
│ 保存       │  更新会话 updated_at
└────────────┘
```

### 6.2 文本处理流程

```
原始文档
    │
    ▼
┌────────────┐  支持 .txt .md .pdf .docx
│ 文本提取   │  pypdf / python-docx / 直接读取
└────────────┘
    │
    ▼
┌────────────┐  规范化：统一换行符、压缩空行
│ 文本清洗   │  去除多余空白字符
└────────────┘
    │
    ▼
┌────────────┐  按段落切分，chunk_size=100，overlap=20
│ 文本切分   │  短段落合并，长段落截断
└────────────┘
    │
    ▼
┌────────────┐  blake2b 哈希 + 计数加权
│ 向量嵌入   │  384维向量，归一化
└────────────┘
    │
    ▼
┌────────────┐  JSON 序列化存储
│ 数据入库   │  SQLite chunks 表
└────────────┘
```

### 6.3 Prompt 设计

```
System Prompt:
你是校园知识问答助手。只根据给定资料回答；资料不足时明确说明。
使用简洁中文，并用 [1]、[2] 标注引用。

User Prompt:
资料：
[1] 文档标题1
文档内容片段1

[2] 文档标题2
文档内容片段2

...

问题：{用户问题}
```

---

## 7. 安全架构设计

### 7.1 认证流程

```
┌────────┐                          ┌────────┐
│ 客户端 │  ──(1) 登录请求────────> │ 服务端 │
│        │  email + password        │        │
│        │                          │        │
│        │ <─(2) 验证密码，生成Token─│        │
│        │  JWT (HS256, 24h)        │        │
│        │                          │        │
│        │  ──(3) 后续请求携带Token──>│        │
│        │  Authorization: Bearer   │        │
│        │                          │        │
│        │ <─(4) 验证Token有效性─────│        │
│        │  检查签名、过期时间、用户状态│      │
└────────┘                          └────────┘
```

### 7.2 权限控制矩阵

| 功能 | 访客 | 学生 | 管理员 |
|------|------|------|--------|
| 注册/登录 | ✅ | ✅ | ✅ |
| 查看个人信息 | ⬜ | ✅ | ✅ |
| 发起问答 | ⬜ | ✅ | ✅ |
| 查看历史会话 | ⬜ | ✅ | ✅（仅自己） |
| 上传文档 | ⬜ | ⬜ | ✅ |
| 管理文档 | ⬜ | ⬜ | ✅ |
| 管理用户 | ⬜ | ⬜ | ✅ |
| 查看统计 | ⬜ | ⬜ | ✅ |

### 7.3 安全措施清单

| 措施 | 实现 |
|------|------|
| 密码加密 | PBKDF2-SHA256 + Salt |
| Token 安全 | HS256 签名 + 过期时间 |
| SQL 注入防护 | 参数化查询 |
| XSS 防护 | 前端转义 + CSP |
| CSRF 防护 | CORS 白名单 + Token 验证 |
| 文件上传安全 | 扩展名白名单 + 大小限制 + 随机文件名 |
| 敏感信息保护 | 环境变量存储密钥 |

---

## 8. 本地运行架构设计

### 8.1 开发环境

```
┌─────────────────────────────────────────┐
│              开发环境                    │
│  ┌─────────────┐    ┌─────────────┐    │
│  │ 前端开发服务器 │    │ 后端开发服务器 │    │
│  │ Vite :5173  │    │ Uvicorn:8000│    │
│  │ (热更新)     │    │ (自动重载)   │    │
│  └─────────────┘    └─────────────┘    │
│         │                  │           │
│         └────── CORS ──────┘           │
│                                          │
│  SQLite: backend/data/campus_qa.db      │
│  Uploads: backend/data/uploads/         │
└─────────────────────────────────────────┘
```

### 8.2 环境变量配置

| 变量 | 本地配置 | 说明 |
|------|----------|------|
| `APP_SECRET` | 开发密钥 | 本地 Token 签名密钥 |
| `DATABASE_PATH` | `data/campus_qa.db` | SQLite 文件路径 |
| `UPLOAD_DIR` | `data/uploads` | 上传文件目录 |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | 本地前端地址 |
| `DASHSCOPE_API_KEY` | 必填 | DashScope API 密钥 |
| `EMBEDDING_MODEL` | `text-embedding-v3` | 向量模型 |
| `LLM_MODEL` | `qwen-turbo` | 问答模型 |

---

## 附录：现有实现与设计的对照

| 设计项 | 已有实现 | 差异/备注 |
|--------|----------|-----------|
| 后端框架 | FastAPI + Uvicorn | ✅ 一致 |
| 数据库 | SQLite | ✅ 一致 |
| 向量模型 | 确定性哈希词袋 | ✅ 一致 |
| 密码加密 | PBKDF2-SHA256 | ✅ 一致 |
| Token | JWT HS256 | ✅ 一致 |
| 文档格式 | TXT/MD/PDF/DOCX | ✅ 一致 |
| 问答流式 | SSE | ✅ 一致 |
| 前端 | 缺失 | ⚠️ 待实现 |
| 后端模块拆分 | 单文件 main.py | ⚠️ 建议重构 |
| 索引优化 | 基础索引 | ⚠️ 建议新增 |
| 多轮对话 | 不支持 | ⚠️ 待实现 |
| Token 刷新 | 不支持 | ⚠️ 待实现 |

---

*文档结束*
