# 校园知识问答助手 - Windows 环境搭建指南

> 适用对象：大三学生 / 机房 Windows 10/11
> 系统要求：Win 10 1809+ 或 Win 11，**8GB 内存以上**

---

## 一、安装前的准备

1. 用**管理员**身份打开 PowerShell
   - `Win + X` → **终端（管理员）** 或 **Windows PowerShell（管理员）**
2. 把项目放在 **D 盘**（不要放桌面、不要含中文路径）

---

## 二、一键安装所有工具

把下面整段代码**复制到 PowerShell 里回车执行**：

```powershell
# 配置国内镜像（加速下载，避免超时）
npm config set registry https://registry.npmmirror.com
[Environment]::SetEnvironmentVariable("UV_INDEX_URL", "https://pypi.tuna.tsinghua.edu.cn/simple", "User")

# 一键安装：Git + Node.js 20 + Python 3.12 + uv
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements
winget install --id astral-sh.uv -e --source winget --accept-package-agreements --accept-source-agreements
```

> ⚠️ 如果 `winget` 命令不存在（Win 10 旧版），去 https://git-scm.com、https://nodejs.org、https://www.python.org、https://github.com/astral-sh/uv 手动下载 .msi 安装，安装时**全部保持默认勾选**（特别是 Python 的 "Add to PATH"）。

**装完关闭 PowerShell，重新打开一个管理员窗口**，让环境变量生效。

---

## 三、验证安装

```powershell
git --version
node -v
npm -v
python --version
uv --version
```

5 个命令都要正常输出版本号才算成功。

---

## 四、克隆项目并安装依赖

```powershell
# 1. 克隆代码
cd D:\
git clone https://github.com/<your-name>/campus-practice.git
cd D:\campus-practice

# 2. 后端依赖
cd backend
uv sync --extra dev
copy .env.example .env

# 3. 编辑 .env，填入阿里云 DashScope API Key
notepad .env
# 找到 DASHSCOPE_API_KEY=your-dashscope-api-key
# 改成：DASHSCOPE_API_KEY=sk-你的真实密钥

# 4. 前端依赖
cd ..\frontend
npm install
```

> 💡 没有 API Key 的同学，去 https://dashscope.console.aliyun.com/ 注册阿里云账号 → 开通百炼 → 创建 API Key（有免费额度）。

---

## 五、下载预构建的向量库

```powershell
cd D:\campus-practice
python scripts\download-demo-index.py <your-name>/campus-practice
```

> 脚本会自动从 GitHub Release 下载并解压到 `backend\data\llama_index_storage\`。
> 如果下载失败，联系助教手动拷贝。

---

## 六、启动项目（需要 3 个终端）

**终端 1 - 后端（端口 8000）：**
```powershell
cd D:\campus-practice\backend
uv run uvicorn app.main:app --reload
```

**终端 2 - 前端管理后台（端口 5173）：**
```powershell
cd D:\campus-practice\frontend
npm run dev
```

**终端 3 - 门户首页 + 机器人 Widget（端口 8080）：**
```powershell
cd D:\campus-practice\site-snapshot
py -m http.server 8080
```

---

## 七、访问地址

| 入口 | 地址 |
|---|---|
| 问答前台（首页+机器人） | http://localhost:8080/index-widget.html |
| 管理后台 | http://localhost:5173/#/admin |
| API 文档 | http://localhost:8000/docs |

**默认管理员账号**：`admin@campus.example` / `admin123`

---

## 八、常见问题速查

| 问题 | 解决办法 |
|---|---|
| `python` 不是内部命令 | 重装 Python，安装时**勾选 Add to PATH** |
| `winget` 不存在 | Win 10 去应用商店搜「应用安装器」安装，或手动下载 |
| 端口被占用 | `netstat -ano \| findstr :8000` 找 PID，`taskkill /PID <pid> /F` |
| 安装超时/失败 | 检查国内镜像是否设置成功；联系助教 |
| `uv sync` 报错 | 删除 `backend\.venv` 后重新 `uv sync --extra dev` |
| `npm install` 卡住 | 删除 `frontend\node_modules` 后重试 |

---

## 九、报修方式

环境装不上的同学，把**报错截图**发给助教，提供：
1. 操作系统版本（Win 10 / Win 11）
2. 报错命令和完整报错信息
3. PowerShell 执行 `node -v && npm -v && python --version && uv --version` 的输出