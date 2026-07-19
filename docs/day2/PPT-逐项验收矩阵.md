# Day2 PPT 逐项验收矩阵

核对依据：`校园问答助手开发项目 - Day2 基础功能开发.pptx`，共 32 页。  
核对日期：2026-07-16。

状态说明：

- **已完成**：代码、界面、测试或交付文件可直接验证。
- **等价完成**：PPT 使用 Spring Boot / MyBatis-Plus / Axios / Ant Design 示例，本仓库使用 FastAPI / SQLite / Fetch / 自定义 React 组件实现同等功能。
- **拓展项**：课件明确标注可选、推荐或策略说明，不属于第 31 页功能验收硬指标。

| PPT 页码 | 要求 | 项目实现 | 状态 | 验证位置 |
|---|---|---|---|---|
| 4 | 系统流程图、问答流程、文档处理流程 | 已绘制系统整体流程，覆盖认证、用户 CRUD、问答、文档解析、切分、向量化和 FAISS | 已完成 | `docs/day2/系统整体流程.png` |
| 5 | RAG 六步流程、异常处理、SSE | 查询向量化、TopK 检索、上下文、Prompt、LLM、SSE、引用和异常分支均已实现 | 已完成 | `docs/day2/RAG问答流程.png`、`backend/app/rag_engine_v2.py` |
| 6 | 分层职责 | FastAPI 路由、数据库访问、安全模块、RAG 引擎和前端 API 层已分离 | 等价完成 | `backend/app/`、`frontend/src/api.ts` |
| 7 | 统一响应处理 | 使用标准 HTTP 状态码；前端 `fetchApi` 统一解包、错误转换和 401 处理 | 等价完成 | `frontend/src/api.ts` |
| 8 | 全局异常与参数校验 | Pydantic 自动参数校验，FastAPI 统一生成错误响应，前端集中展示错误 | 等价完成 | `backend/app/main.py`、`frontend/src/api.ts` |
| 10-12 | Web、校验、数据库、跨域、接口调试 | FastAPI、Pydantic、SQLite、CORS、OpenAPI `/docs` 已配置 | 等价完成 | `backend/pyproject.toml`、`backend/app/main.py` |
| 11 | 用户实体与数据访问 | `users` 表包含 id、姓名、邮箱、密码哈希、角色、状态、创建时间 | 已完成 | `backend/app/database.py` |
| 13 | 用户列表、注册、修改、删除接口 | GET/POST/PATCH/DELETE 用户接口完整 | 已完成 | `backend/app/main.py` |
| 14 | 分页与关键字查询 | 后端分页，支持姓名/邮箱搜索、角色和状态筛选 | 已完成 | `GET /api/users` |
| 15 | 注册校验、查重、密码加密 | 邮箱查重、字段校验、密码使用带盐 PBKDF2-HMAC-SHA256 哈希 | 等价完成 | `backend/app/security.py` |
| 16 | 完整 CRUD、软删除、角色筛选 | 新增、分页查询、资料编辑、角色修改、启停、软删除均完成 | 已完成 | `UsersPage.tsx`、接口测试 |
| 18 | 登录、退出、无状态会话、安全比对 | 登录校验、客户端退出、无状态 JWT、常数时间密码比对 | 已完成 | `security.py`、`AuthContext.tsx` |
| 19-20 | JWT 生成、过期与角色 Claims | 自实现 HS256 JWT，包含 `sub`、`role`、`exp`，默认 24 小时 | 已完成 | `backend/app/security.py` |
| 19 | Access + Refresh 双 Token | 课件作为 Token 策略介绍；当前教学版采用单个 24 小时 Access Token | 拓展项 | 不影响第 31 页验收 |
| 21 | 登录接口 | 错误密码 401、停用账号 403、成功返回 Token 和安全用户信息 | 已完成 | `POST /api/auth/login` |
| 22 | Token 拦截与公开路径 | `current_user` 统一校验 Bearer Token；注册、登录、健康检查公开 | 已完成 | `backend/app/main.py` |
| 23 | 登录状态和角色权限 | 初始 Token 自动验证、401 自动退出、普通用户禁止进入管理后台、后端 403 兜底 | 已完成 | `AuthContext.tsx`、`App.tsx`、接口测试 |
| 25 | 请求封装与拦截 | Fetch 统一封装、自动携带 Token、统一处理错误和 401 | 等价完成 | `frontend/src/api.ts` |
| 26 | 登录页 | 邮箱、密码、错误提示、登录后进入后台 | 已完成 | `AuthPage.tsx` |
| 27 | 登录/注册、记住我、确认密码、强度提示 | 已加入记住登录状态、确认密码、密码强度提示和邮箱校验 | 已完成 | `AuthPage.tsx` |
| 27 | React Router | 当前项目采用轻量 Hash 路由与路由守卫，无额外 Router 依赖 | 等价完成 | `App.tsx` |
| 28 | 用户表格分页与搜索 | 后端分页数据接入，搜索、页大小、上一页和下一页完成 | 已完成 | `UsersPage.tsx` |
| 29 | 角色筛选、编辑、启停、删除、新增、管理员可见 | 全部完成；删除有确认框，当前管理员不能停用、删除或自我降权 | 已完成 | `UsersPage.tsx`、`main.py` |
| 30 | CORS、401、密码、分页、创建时间调试项 | CORS、Bearer Token、密码哈希、分页和创建时间均验证通过 | 已完成 | 自动化测试与浏览器验收 |
| 31 | 代码提交 | 已在本地 Git 提交，远程指向小组 GitHub 仓库 | 已完成 | Git 提交记录 |
| 31 | 开发记录 | 团队级开发与验收记录已整理 | 已完成 | `DAY2-SUBMISSION.md` |
| 31 | 系统流程图 + RAG 流程图 | PNG、SVG、DOT 可编辑源文件齐全 | 已完成 | `docs/day2/` |
| 31 | 用户 CRUD 模块 | 前后端和接口测试完整覆盖 | 已完成 | `backend/tests/test_api.py` |

## 第 31 页验收标准结论

| 验收标准 | 结果 | 证据 |
|---|---|---|
| 用户可正常注册、登录、退出 | 通过 | 浏览器实测 + 接口测试 |
| 管理员可查看、编辑、禁用、删除用户 | 通过 | 浏览器实测 + 接口测试 |
| 未登录无法访问认证页面 | 通过 | 无 Token 返回 401 |
| 普通用户无法进入用户管理页面 | 通过 | 路由守卫提示无权限；接口返回 403 |
| 所有接口具有正确权限校验 | 通过 | `current_user` / `admin_user` 依赖与测试覆盖 |

## 技术栈差异说明

课件代码是 Spring Boot 教学示例，老师提供的实际仓库是 FastAPI + SQLite + React。为保持仓库一致性，本次采用等价实现：

- `Result<T>` 对应标准 HTTP 状态码 + 前端统一 `fetchApi` 响应处理。
- `@RestControllerAdvice` 对应 FastAPI/Pydantic 的集中参数校验与异常响应。
- MyBatis-Plus 分页对应 SQLite 参数化查询的 `LIMIT/OFFSET`。
- BCrypt 对应带随机盐、210000 轮的 PBKDF2-HMAC-SHA256，均不保存明文密码。
- Axios 拦截器对应 Fetch 封装与全局 401 事件。
- React Router 对应本项目现有 Hash 路由与路由守卫。

以上差异不影响 PPT 第 31 页的功能验收标准。
