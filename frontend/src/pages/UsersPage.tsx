import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useAuth } from "../context/auth-context";
import { api } from "../api";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Loader,
  Search,
  UserRoundCheck,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

type EditorState = { mode: "create" } | { mode: "edit"; user: UserItem };

export function UsersPage() {
  const { token, user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [adminTotal, setAdminTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.users.list(token, {
        page,
        size: pageSize,
        keyword: query.trim() || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter ? statusFilter === "active" : undefined,
      });
      setUsers(data.records);
      setTotal(data.total);
      setActiveTotal(data.active_total);
      setAdminTotal(data.admin_total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "用户列表加载失败");
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, query, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditor({ mode: "create" });
    setName("");
    setEmail("");
    setPassword("");
    setRole("STUDENT");
    setError("");
  };

  const openEdit = (user: UserItem) => {
    setEditor({ mode: "edit", user });
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setError("");
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !editor) return;
    setSaving(true);
    setError("");
    try {
      if (editor.mode === "create") {
        await api.users.create(token, { name, email, password, role });
        if (page !== 1) {
          setPage(1);
        } else {
          await loadUsers();
        }
      } else {
        await api.users.update(token, editor.user.id, { name, email, role });
        await loadUsers();
      }
      setEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (user: UserItem) => {
    if (!token) return;
    try {
      await api.users.update(token, user.id, {
        role: user.role === "ADMIN" ? "STUDENT" : "ADMIN",
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "角色更新失败");
    }
  };

  const toggleActive = async (user: UserItem) => {
    if (!token) return;
    try {
      await api.users.update(token, user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败");
    }
  };

  const deleteUser = async (user: UserItem) => {
    if (!token || !window.confirm(`确认软删除用户“${user.name}”吗？该账号将立即停用。`)) {
      return;
    }
    try {
      await api.users.delete(token, user.id);
      if (users.length === 1 && page > 1) {
        setPage((value) => value - 1);
      } else {
        await loadUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  if (!isAdmin()) {
    return (
      <div className="page">
        <div className="page-header"><h1>用户管理</h1></div>
        <p className="no-access">只有管理员可以管理用户</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">IDENTITY & ACCESS</span>
          <h1>用户与权限</h1>
          <p>新增、查询、编辑和软删除校园用户，维护账号状态与管理权限。</p>
        </div>
      </header>

      <section className="metric-strip">
        <div><Users size={20} /><span><b>{total}</b>筛选结果</span></div>
        <div><UserRoundCheck size={20} /><span><b>{activeTotal}</b>正常账号</span></div>
        <div><ShieldCheck size={20} /><span><b>{adminTotal}</b>管理员</span></div>
      </section>

      <div className="list-toolbar">
        <div><h2>用户目录</h2><span>角色与账号状态实时生效</span></div>
        <div className="user-toolbar-actions">
          <label className="search-box">
            <Search size={16} />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="搜索姓名或邮箱" />
          </label>
          <select aria-label="按角色筛选" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">全部角色</option>
            <option value="STUDENT">学生</option>
            <option value="ADMIN">管理员</option>
          </select>
          <select aria-label="按状态筛选" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">全部状态</option>
            <option value="active">启用</option>
            <option value="inactive">停用</option>
          </select>
          <button className="add-user-button" onClick={openCreate}><Plus size={16} />新增用户</button>
        </div>
      </div>

      {error && !editor && <div className="error-msg user-error">{error}</div>}

      {editor && (
        <div className="user-editor-backdrop" role="presentation">
          <form className="user-editor" onSubmit={saveUser}>
            <div className="user-editor-heading">
              <div><small>USER CRUD</small><h2>{editor.mode === "create" ? "新增用户" : "编辑用户"}</h2></div>
              <button type="button" aria-label="关闭" onClick={() => setEditor(null)}><X size={20} /></button>
            </div>
            <label>姓名<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={40} required /></label>
            <label>邮箱<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            {editor.mode === "create" && (
              <label>初始密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} maxLength={72} required /></label>
            )}
            <label>角色
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="STUDENT">学生</option>
                <option value="ADMIN">管理员</option>
              </select>
            </label>
            {error && <div className="error-msg">{error}</div>}
            <div className="user-editor-actions">
              <button type="button" onClick={() => setEditor(null)}>取消</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading"><Loader size={24} className="spin" /> 加载中...</div>
      ) : (
        <>
          <div className="user-table-wrapper">
            <table className="user-table">
              <thead><tr><th>ID</th><th>姓名</th><th>邮箱</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={7} className="empty">暂无用户</td></tr>}
                {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td><td>{user.name}</td><td>{user.email}</td>
                  <td><span className={`badge ${user.role.toLowerCase()}`}>{user.role === "ADMIN" ? <><Shield size={12} /> 管理员</> : <><Users size={12} /> 学生</>}</span></td>
                  <td><span className={`badge ${user.is_active ? "active" : "inactive"}`}>{user.is_active ? <><UserCheck size={12} /> 启用</> : <><UserX size={12} /> 停用</>}</span></td>
                  <td>{new Date(user.created_at).toLocaleString("zh-CN")}</td>
                  <td><div className="actions">
                    <button title="编辑" onClick={() => openEdit(user)}><Pencil size={13} />编辑</button>
                    <button disabled={user.id === currentUser?.id && user.role === "ADMIN"} title={user.id === currentUser?.id ? "不能取消自己的管理权限" : undefined} onClick={() => toggleRole(user)}>{user.role === "ADMIN" ? "设为学生" : "设为管理员"}</button>
                    <button disabled={user.id === currentUser?.id && user.is_active} title={user.id === currentUser?.id ? "不能停用当前账号" : undefined} onClick={() => toggleActive(user)}>{user.is_active ? "停用" : "启用"}</button>
                    <button className="danger" disabled={user.id === currentUser?.id} title={user.id === currentUser?.id ? "不能删除当前账号" : "软删除"} onClick={() => deleteUser(user)}><Trash2 size={13} />删除</button>
                  </div></td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="user-pagination">
            <span>共 {total} 条，第 {page} / {totalPages} 页</span>
            <label>每页
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</button>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>下一页</button>
          </div>
        </>
      )}
    </div>
  );
}
