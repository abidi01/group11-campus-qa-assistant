import {
  ArrowUpRight,
  Bot,
  Database,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { ChatWidget } from "./ChatWidget";
import { ThemeToggle } from "./ThemeToggle";

export function PublicHome() {
  return (
    <div className="public-shell">
      <div className="cyber-grid" aria-hidden="true" />
      <header className="public-nav">
        <a className="public-brand" href="/" aria-label="河海智问首页">
          <span className="public-brand-icon"><img src="/hohai-emblem.png" alt="河海大学校徽" /></span>
          <span><b>河海智问</b><small>HHU NEXUS</small></span>
        </a>
        <div className="public-nav-status"><i /> CAMPUS KNOWLEDGE ONLINE</div>
        <div className="public-nav-actions">
          <ThemeToggle />
          <a className="public-admin-link" href="#/admin">管理控制台 <ArrowUpRight size={15} /></a>
        </div>
      </header>

      <main className="public-hero">
        <section className="public-copy">
          <span className="public-kicker"><Sparkles size={14} /> HOHAI UNIVERSITY · AI KNOWLEDGE NEXUS</span>
          <h1>让每个校园问题，<br /><em>抵达可信答案。</em></h1>
          <p>连接校本知识、办事指南与校园服务，为河海师生提供有来源、可追溯的智能问答体验。</p>
          <div className="public-actions">
            <button onClick={() => useChatStore.getState().setIsOpen(true)}>
              <span>启动智能问答</span><ArrowUpRight size={18} />
            </button>
            <span className="action-hint"><i /> AI 引擎已就绪</span>
          </div>
          <div className="public-features">
            <div><Database size={17} /><span><b>校本知识库</b><small>权威资料实时检索</small></span></div>
            <div><ShieldCheck size={17} /><span><b>答案可追溯</b><small>来源依据清晰呈现</small></span></div>
            <div><Radio size={17} /><span><b>连续对话</b><small>理解上下文与意图</small></span></div>
          </div>
        </section>

        <section className="nexus-visual" aria-label="校园知识网络运行状态">
          <div className="visual-label top"><span>STATUS</span><b>ONLINE</b></div>
          <div className="orbit orbit-one"><i /><i /><i /></div>
          <div className="orbit orbit-two"><i /><i /></div>
          <div className="nexus-core">
            <span className="core-halo" />
            <Bot size={42} />
            <b>HHU AI</b>
            <small>KNOWLEDGE CORE</small>
          </div>
          <div className="data-node node-one"><Database size={15} /><span>知识索引<b>CONNECTED</b></span></div>
          <div className="data-node node-two"><ShieldCheck size={15} /><span>可信校验<b>ACTIVE</b></span></div>
          <div className="data-node node-three"><Radio size={15} /><span>语义引擎<b>READY</b></span></div>
          <div className="visual-label bottom"><span>RESPONSE LATENCY</span><b>&lt; 2.0 SEC</b></div>
        </section>
      </main>

      <footer className="public-footer">
        <span>© 2026 HOHAI UNIVERSITY</span>
        <span>智能知识服务 · 让信息汇流成河</span>
        <span className="footer-coordinates">32.057°N / 118.774°E</span>
      </footer>
      <ChatWidget />
    </div>
  );
}
