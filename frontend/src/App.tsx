import { useEffect, useState } from "react";
import { useAuth } from "./context/auth-context";
import { ChatPage } from "./pages/ChatPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { UsersPage } from "./pages/UsersPage";
import { WebImportPage } from "./pages/WebImportPage";
import { AuthPage, RegisterPage } from "./pages/AuthPage";
import { PublicHome } from "./components/PublicHome";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  MessageSquare,
  BookOpen,
  Users,
  LogOut,
  Menu,
  X,
  Globe2,
} from "lucide-react";

type Page = "chat" | "knowledge" | "web" | "users";

function useAdminRoute() {
  const [isAdmin, setIsAdmin] = useState(
    () =>
      window.location.hash.startsWith("#/admin") ||
      window.location.pathname
        .replace(/\/$/, "")
        .endsWith("/admin")
  );

  useEffect(() => {
    const check = () =>
      setIsAdmin(
        window.location.hash.startsWith("#/admin") ||
          window.location.pathname
            .replace(/\/$/, "")
            .endsWith("/admin")
      );
    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };
  }, []);

  return isAdmin;
}

export default function App() {
  const { token, user, checkingAuth, logout, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>("chat");
  const [showRegister, setShowRegister] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdminRoute = useAdminRoute();

  if (checkingAuth) {
    return <div className="auth-checking">正在验证登录状态...</div>;
  }

  if (!token) {
    return isAdminRoute ? (
      <div className="auth-theme-scope">
        <ThemeToggle />
        {showRegister ? (
          <RegisterPage onToggle={() => setShowRegister(false)} />
        ) : (
          <AuthPage onToggle={() => setShowRegister(true)} />
        )}
      </div>
    ) : (
      <PublicHome />
    );
  }

  const navItems = [
    { key: "chat" as Page, label: "问答", icon: MessageSquare },
    { key: "knowledge" as Page, label: "知识库", icon: BookOpen },
    { key: "web" as Page, label: "网页采集", icon: Globe2 },
    ...(isAdmin()
      ? [{ key: "users" as Page, label: "用户", icon: Users }]
      : []),
  ];

  if (isAdminRoute) {
    return (
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-brand">
            <button
              className="menu-btn"
              aria-label={sidebarOpen ? "关闭菜单" : "打开菜单"}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="brand-seal">
              <img src="/hohai-emblem.png" alt="河海大学校徽" />
            </span>
            <div>
              <strong>河海大学</strong>
              <span>校园知识工作台</span>
            </div>
          </div>
          <div className="admin-user">
            <span className="system-state">
              <i />
              知识服务运行中
            </span>
            <div className="user-meta">
              <strong>{user?.name}</strong>
              <span>{isAdmin() ? "系统管理员" : "校园用户"}</span>
            </div>
            <ThemeToggle />
            <button className="logout-btn" aria-label="退出登录" onClick={logout}>
              <LogOut size={17} />
              <span>退出</span>
            </button>
          </div>
        </header>

        <div className="admin-body">
          <nav className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="nav-caption">工作台</div>
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`admin-nav-item ${page === item.key ? "active" : ""}`}
                onClick={() => {
                  setPage(item.key);
                  setSidebarOpen(false);
                }}
              >
                <item.icon size={18} />
                <span>
                  {item.label === "问答"
                    ? "问答工作台"
                    : item.label === "知识库"
                      ? "知识库管理"
                      : item.label === "网页采集"
                        ? "网页采集"
                        : "用户与权限"}
                </span>
                <i />
              </button>
            ))}
            <div className="sidebar-note">
              <span>HHU · AI</span>
              <p>让校园信息更容易被找到，也更值得信赖。</p>
            </div>
          </nav>

          <main className="admin-content">
            {page === "chat" && <ChatPage />}
            {page === "knowledge" && <KnowledgePage />}
            {page === "web" && <WebImportPage onGoKnowledge={() => setPage("knowledge")} />}
            {page === "users" && <UsersPage />}
          </main>
        </div>
      </div>
    );
  }

  return <PublicHome />;
}
