# Day2 作业提交说明

提交人：项目组
日期：2026-07-16

## 已完成内容

- 系统整体流程图与 RAG 问答流程图
- 学生注册、登录、退出和 JWT 登录态保护
- 管理员用户完整 CRUD
  - 新增用户
  - 用户列表与搜索
  - 编辑姓名、邮箱和角色
  - 启用、停用和软删除
- 后端分页、姓名/邮箱搜索、角色筛选和状态筛选
- 前后端双重角色权限控制
- 初始 Token 自动验证、401 自动退出和普通用户路由守卫
- 登录“记住我”、注册确认密码和密码强度提示
- 自动化接口测试
- 桌面端与移动端页面验收
- 团队开发记录

## 交付文件

- 项目代码：当前目录
- 流程图：`docs/day2/`
- 验收截图：`docs/screenshots/day2-users-crud.png`、`docs/screenshots/day2-users-mobile.png`
- PPT 逐项验收矩阵：`docs/day2/PPT-逐项验收矩阵.md`

## 运行环境

- Python 3.11+
- Node.js 20+
- uv
- 有效的 DashScope API Key

## 启动步骤

1. 后端安装与配置

```powershell
cd backend
uv sync --extra dev
Copy-Item .env.example .env
```

编辑 `backend/.env`，填写有效的 `DASHSCOPE_API_KEY`。

2. 启动后端

```powershell
uv run uvicorn app.main:app --reload
```

3. 新开终端启动前端

```powershell
cd frontend
npm install
npm run dev
```

4. 访问地址

- 管理后台：<http://localhost:5173/#/admin>
- API 文档：<http://localhost:8000/docs>

默认管理员：

```text
邮箱：admin@campus.example
密码：admin123
```

## 验证命令

```powershell
cd backend
uv run pytest -q

cd ../frontend
npm run lint
npm run build
```

本次验证结果：后端 2 组测试全部通过，前端规范检查和生产构建通过。

## 安全说明

- `.env`、数据库、上传文件、依赖目录和构建缓存均不会提交。
- 密码只保存哈希值。
- 用户接口使用字段白名单，不返回密码哈希。
- 当前管理员不能停用或删除自己。
- 当前管理员不能取消自己的管理权限。
- 删除用户采用软删除，保留历史数据和审计链。
