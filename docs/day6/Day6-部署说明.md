# Day6 部署说明

## 推荐方式：Docker 一键启动

### 1. 准备配置

复制 `backend/.env.example` 为 `backend/.env`，填写模型服务密钥。不要将 `.env` 上传到代码仓库或提交包。

### 2. 构建并启动

在项目根目录执行：

```powershell
docker compose up -d --build
```

启动后访问：

- 前端：`http://localhost`
- 后端健康检查：`http://localhost:8000/api/health`
- 接口文档：`http://localhost:8000/docs`

前端 Nginx 已配置单页应用回退、静态资源缓存、API 反向代理与 SSE 流式传输。

### 3. 健康检查与冒烟测试

```powershell
cd backend
uv run python ../scripts/smoke_test.py --base-url http://localhost:8000
```

冒烟测试依次验证健康状态、管理员登录、同步 RAG 问答和历史记录保存。

可选性能基线：

```powershell
uv run python ../scripts/performance_check.py --base-url http://localhost:8000/api
```

### 4. 停止服务

```powershell
docker compose down
```

数据库与上传文件保存在 Docker 卷中。需要清空数据时才使用 `docker compose down -v`。

## 本地开发方式

后端：

```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

前端另开终端：

```powershell
cd frontend
npm install
npm run dev
```

## 发布包说明

- 前端静态包：解压后可由 Nginx、Apache 或静态托管服务发布。
- 后端 Wheel：Python 项目的标准可安装包，对应 Java 项目中的 JAR 交付物。
- 演示 FAISS 索引包：解压到 `backend/data/llama_index_storage/`，可直接加载演示索引。
- Docker 配置：用于在统一环境中复现完整系统。

## 常见问题

- AI 返回错误：检查模型密钥、网络和账户额度。
- 上传后暂时不能检索：等待文档状态变为“已完成”。
- 流式回答一次性出现：确认反向代理关闭响应缓冲；本项目 Nginx 配置已处理。
- 端口占用：调整 `docker-compose.yml` 中宿主机端口映射。
