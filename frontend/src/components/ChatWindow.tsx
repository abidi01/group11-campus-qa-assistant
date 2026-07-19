import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth-context";
import { useChatStore, type Source, type Message } from "../store/chatStore";
import { api, type AnswerInsight } from "../api";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { QuickQuestions } from "./QuickQuestions";
import { ConversationSidebar } from "./ConversationSidebar";
import { ThemeToggle } from "./ThemeToggle";
import {
  createTypewriterStream,
  startAiActivity,
  type TypewriterStream,
} from "../utils/chatPresentation";
import { Loader, X, ShieldCheck } from "lucide-react";

export function ChatWindow({ onClose }: { onClose: () => void }) {
  const { token, login } = useAuth();
  const guestLoadingRef = useRef(false);
  const {
    messages,
    loading,
    conversations,
    currentId,
    setMessages,
    setConversations,
    setCurrentId,
    addMessage,
    updateAssistantMessage,
    setLoading,
    clearMessages,
  } = useChatStore();
  const loadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const typewriterRef = useRef<TypewriterStream | null>(null);
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [activity, setActivity] = useState("");

  const loadConversations = useCallback(async (keyword = historyKeyword) => {
    if (!token) return;
    try {
      const data = await api.conversations.list(token, keyword);
      setConversations(data);
    } catch {
      // ignore
    }
  }, [token, setConversations, historyKeyword]);

  useEffect(() => {
    if (token && !loadedRef.current) {
      void loadConversations();
      loadedRef.current = true;
    }
  }, [token, loadConversations]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      void loadConversations(historyKeyword);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, historyKeyword, loadConversations]);

  useEffect(() => {
    if (!token && !guestLoadingRef.current) {
      guestLoadingRef.current = true;
      api
        .guestLogin()
        .then((res) => login(res.token, res.user, false))
        .catch(() => {
          guestLoadingRef.current = false;
        });
    }
  }, [token, login]);

  const handleSend = async (text: string) => {
    if (!token || loading) return;
    const question = text.trim();
    if (!question) return;

    const userMsgId = Date.now();
    const assistantId = userMsgId + 1;

    addMessage({ id: userMsgId, role: "USER", content: question });
    setLoading(true);
    addMessage({
      id: assistantId,
      role: "ASSISTANT",
      content: "",
      sources: [],
    });

    let activityVisible = true;
    const stopActivity = startAiActivity(setActivity);
    const typewriter = createTypewriterStream((content) => {
      if (activityVisible) {
        activityVisible = false;
        stopActivity();
        setActivity("");
      }
      updateAssistantMessage(assistantId, content);
    });
    typewriterRef.current = typewriter;

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantContent = "";
    let sources: Source[] = [];
    let insight: AnswerInsight | undefined;

    try {
      const res = await api.chat.stream(
        token,
        question,
        currentId,
        controller.signal,
      );
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";
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
              assistantContent += parsed.text || "";
              typewriter.append(parsed.text || "");
            } catch {
              // ignore
            }
          }
        }
      }

      await typewriter.finish();
      const finalContent = typewriter.isStopped()
        ? typewriter.current()
        : assistantContent;
      updateAssistantMessage(assistantId, finalContent || "已停止生成。", sources, insight);

      await loadConversations();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        const stoppedContent = typewriter.stop();
        updateAssistantMessage(
          assistantId,
          stoppedContent || "已停止生成。",
          sources,
          insight,
        );
        return;
      }
      typewriter.cancel();
      updateAssistantMessage(
        assistantId,
        "抱歉，请求出错：" + (err instanceof Error ? err.message : "未知错误"),
      );
    } finally {
      stopActivity();
      setActivity("");
      abortRef.current = null;
      if (typewriterRef.current === typewriter) typewriterRef.current = null;
      setLoading(false);
    }
  };

  const stopGeneration = () => {
    typewriterRef.current?.stop();
    abortRef.current?.abort();
  };

  const loadConversation = async (id: number) => {
    if (!token) return;
    setCurrentId(id);
    try {
      const data = await api.conversations.get(token, id);
      const msgs: Message[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        insight: m.confidence
          ? {
              confidence: m.confidence,
              follow_up_questions: m.follow_up_questions || [],
            }
          : undefined,
      }));
      setMessages(msgs);
    } catch {
      clearMessages();
    }
  };

  const newChat = () => {
    stopGeneration();
    setCurrentId(undefined);
    clearMessages();
  };

  const deleteConversation = async (id: number) => {
    if (!token) return;
    await api.conversations.delete(token, id);
    if (currentId === id) newChat();
    await loadConversations(historyKeyword);
  };

  if (!token) {
    return (
      <div className="widget-window widget-loading">
        <Loader size={24} className="animate-spin text-[#005BAC]" />
        <p className="mt-2 text-sm text-gray-500">正在初始化...</p>
      </div>
    );
  }

  return (
    <div className="widget-window">
      <ConversationSidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={loadConversation}
        onNew={newChat}
        onDelete={(id) => void deleteConversation(id)}
        keyword={historyKeyword}
        onKeywordChange={setHistoryKeyword}
      />
      <div className="widget-main">
        <div className="widget-header">
          <span className="widget-brand-icon">
            <img src="/hohai-emblem.png" alt="河海大学校徽" />
          </span>
          <div>
            <h3>河海大学问答助手</h3>
            <p>
              <ShieldCheck size={11} /> 校本知识 · 来源可循
            </p>
          </div>
          <ThemeToggle compact />
          <button onClick={onClose} aria-label="关闭问答助手">
            <X size={17} />
          </button>
        </div>

        <MessageList
          messages={messages}
          loading={loading}
          activity={activity}
          onFollowUp={handleSend}
        />

        {messages.length === 0 && !loading && (
          <QuickQuestions onSelect={handleSend} />
        )}

        <ChatInput
          onSend={handleSend}
          onStop={stopGeneration}
          loading={loading}
        />
      </div>
    </div>
  );
}
