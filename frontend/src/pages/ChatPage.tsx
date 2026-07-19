import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useAuth } from "../context/auth-context";
import {
  api,
  type MessageRecord,
  type SourceRecord,
  type ConversationRecord,
  type AnswerInsight,
} from "../api";
import { AnswerInsights } from "../components/AnswerInsights";
import {
  createTypewriterStream,
  startAiActivity,
  type TypewriterStream,
} from "../utils/chatPresentation";
import {
  Send,
  MessageSquare,
  Trash2,
  Loader,
  Sparkles,
  History,
  Square,
  Search,
  Clock3,
} from "lucide-react";

export function ChatPage() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [currentId, setCurrentId] = useState<number | undefined>();
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState("");
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const typewriterRef = useRef<TypewriterStream | null>(null);

  const loadConversations = useCallback(async (keyword = historyKeyword) => {
    if (!token) return;
    try {
      const data = await api.conversations.list(token, keyword);
      setConversations(data);
    } catch {
      // ignore
    }
  }, [token, historyKeyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConversations(historyKeyword);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [historyKeyword, loadConversations]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: loading ? "auto" : "smooth",
    });
  }, [messages, loading]);

  const handleMessagesScroll = () => {
    const container = messagesRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
  };

  const sendQuestion = async (rawQuestion: string) => {
    if (!rawQuestion.trim() || !token || loading) return;

    const question = rawQuestion.trim();
    shouldAutoScrollRef.current = true;
    setInput("");
    setLoading(true);

    const userMsg: MessageRecord = {
      id: Date.now(),
      role: "USER",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = Date.now() + 1;
    let assistantContent = "";
    const controller = new AbortController();
    abortRef.current = controller;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "ASSISTANT", content: "", sources: [] },
    ]);

    let activityVisible = true;
    const stopActivity = startAiActivity(setActivity);
    const typewriter = createTypewriterStream((content) => {
      if (activityVisible) {
        activityVisible = false;
        stopActivity();
        setActivity("");
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content } : message,
        ),
      );
    });
    typewriterRef.current = typewriter;

    try {
      const res = await api.chat.stream(
        token,
        question,
        currentId,
        controller.signal,
      );
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let sources: SourceRecord[] = [];
      let insight: AnswerInsight | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/^event: (\w+)/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = dataMatch[1];

          if (event === "meta") {
            try {
              const parsed = JSON.parse(data);
              sources = parsed.sources || [];
              insight = parsed.confidence
                ? {
                    confidence: parsed.confidence,
                    follow_up_questions: parsed.follow_up_questions || [],
                  }
                : undefined;
              if (parsed.conversation_id) {
                setCurrentId(parsed.conversation_id);
              }
            } catch {
              // ignore
            }
          } else if (event === "token") {
            try {
              const parsed = JSON.parse(data);
              const text = parsed.text || "";
              assistantContent += text;
              typewriter.append(text);
            } catch {
              // ignore
            }
          } else if (event === "done") {
            break;
          }
        }
      }

      await typewriter.finish();
      const finalContent = typewriter.isStopped()
        ? typewriter.current()
        : assistantContent;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: finalContent || "已停止生成。",
                sources,
                confidence: insight?.confidence,
                follow_up_questions: insight?.follow_up_questions,
              }
            : message,
        ),
      );

      await loadConversations();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        const stoppedContent = typewriter.stop();
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: stoppedContent || "已停止生成。" }
              : message,
          ),
        );
        return;
      }
      typewriter.cancel();
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  "抱歉，请求出错：" +
                  (err instanceof Error ? err.message : "未知错误"),
              }
            : message,
        ),
      );
    } finally {
      stopActivity();
      setActivity("");
      abortRef.current = null;
      if (typewriterRef.current === typewriter) typewriterRef.current = null;
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  const stopGeneration = () => {
    typewriterRef.current?.stop();
    abortRef.current?.abort();
  };

  const loadConversation = async (id: number) => {
    if (!token) return;
    shouldAutoScrollRef.current = true;
    setCurrentId(id);
    try {
      const data = await api.conversations.get(token, id);
      const msgs = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        confidence: m.confidence,
        follow_up_questions: m.follow_up_questions || [],
      }));
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  const newChat = () => {
    stopGeneration();
    shouldAutoScrollRef.current = true;
    setCurrentId(undefined);
    setMessages([]);
  };

  const deleteConversation = async (id: number) => {
    if (!token) return;
    try {
      await api.conversations.delete(token, id);
      await loadConversations();
      if (currentId === id) {
        newChat();
      }
    } catch {
      // ignore
    }
  };

  const requestDelete = (id: number) => {
    setContextMenu(null);
    if (window.confirm("确定删除这个历史会话及其全部问答记录吗？")) {
      void deleteConversation(id);
    }
  };

  const openContextMenu = (event: ReactMouseEvent, id: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ id, x: event.clientX, y: event.clientY });
  };

  const formatConversationTime = (value: string) =>
    new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  const renameConversation = async (conversation: ConversationRecord) => {
    if (!token) return;
    const title = window.prompt("输入新的会话标题", conversation.title)?.trim();
    if (!title || title === conversation.title) return;
    try {
      await api.conversations.update(token, conversation.id, title);
      await loadConversations();
    } catch {
      // 保留原标题，避免失败时打断当前对话
    }
  };

  return (
    <div className="admin-page chat-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">CAMPUS ANSWER DESK</span>
          <h1>问答工作台</h1>
          <p>验证知识检索效果，查看来源引用与连续对话表现。</p>
        </div>
      </header>
      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <button className="btn-new-chat" onClick={newChat}>
              <MessageSquare size={16} />
              新对话
            </button>
            <span>
              <History size={14} /> 最近会话
            </span>
            <label className="conversation-search">
              <Search size={13} />
              <input
                value={historyKeyword}
                onChange={(event) => setHistoryKeyword(event.target.value)}
                placeholder="搜索标题或问答内容"
                aria-label="搜索历史问答"
              />
            </label>
          </div>
          <div className="conversation-list">
            {conversations.length === 0 && (
              <p className="conversation-empty">
                {historyKeyword ? "没有匹配的历史问答" : "暂无历史会话"}
              </p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${currentId === conv.id ? "active" : ""}`}
                onClick={() => loadConversation(conv.id)}
                onDoubleClick={() => renameConversation(conv)}
                onContextMenu={(event) => openContextMenu(event, conv.id)}
                title="点击查看完整会话，双击重命名，右键删除"
              >
                <MessageSquare size={14} />
                <span className="conv-copy">
                  <b className="conv-title">{conv.title}</b>
                  <small>
                    <Clock3 size={10} /> {formatConversationTime(conv.updated_at)} · {conv.message_count} 条消息
                  </small>
                </span>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    requestDelete(conv.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          {contextMenu && (
            <button
              type="button"
              className="conversation-context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(contextMenu.id);
              }}
            >
              <Trash2 size={13} /> 删除会话
            </button>
          )}
        </aside>

        <main className="chat-main">
          <div
            ref={messagesRef}
            className="messages"
            onScroll={handleMessagesScroll}
          >
            {messages.length === 0 && (
              <div className="welcome">
                <span className="welcome-mark">
                  <Sparkles size={24} />
                </span>
                <small>HOHAI KNOWLEDGE ASSISTANT</small>
                <h2>今天想了解河海的什么？</h2>
                <p>试着询问招生、教学、校园服务，回答会标注资料来源。</p>
                <div className="examples">
                  <button onClick={() => setInput("图书馆开放时间？")}>
                    图书馆开放时间？
                  </button>
                  <button onClick={() => setInput("校园卡怎么补办？")}>
                    校园卡怎么补办？
                  </button>
                  <button onClick={() => setInput("奖学金申请条件？")}>
                    奖学金申请条件？
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg, index) => {
              const showActivity = loading
                && msg.role === "ASSISTANT"
                && !msg.content
                && index === messages.length - 1;
              const isTyping = loading
                && msg.role === "ASSISTANT"
                && Boolean(msg.content)
                && index === messages.length - 1;
              return (
              <div key={msg.id} className={`message ${msg.role.toLowerCase()}`}>
                <div className="message-bubble">
                  <div className="message-content">
                    {showActivity ? (
                      <span className="ai-activity">
                        <Loader size={15} className="spin" />
                        {activity || "正在组织回答…"}
                      </span>
                    ) : <span className={isTyping ? "typing-text" : ""}>{msg.content}</span>}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="sources">
                      <div className="sources-title">参考来源：</div>
                      {msg.sources.map((s) => (
                        <div key={s.index} className="source-item">
                          <span className="source-index">[{s.index}]</span>
                          <span className="source-title">{s.title}</span>
                          <span className="source-score">
                            相关度: {(s.score * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.confidence && (
                    <AnswerInsights
                      insight={{
                        confidence: msg.confidence,
                        follow_up_questions: msg.follow_up_questions || [],
                      }}
                      onSelect={(question) => void sendQuestion(question)}
                      disabled={loading}
                    />
                  )}
                </div>
              </div>
              );
            })}
          </div>

          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题，例如：图书馆开放时间？"
              disabled={loading}
            />
            <button
              type={loading ? "button" : "submit"}
              onClick={loading ? stopGeneration : undefined}
              disabled={!loading && !input.trim()}
              aria-label={loading ? "停止生成" : "发送问题"}
            >
              {loading ? <Square size={15} fill="currentColor" /> : <Send size={18} />}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
