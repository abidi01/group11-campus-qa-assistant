import { useEffect, useRef } from "react";
import { User, Bot, Loader } from "lucide-react";
import type { Message } from "../store/chatStore";
import { SourceCitations } from "./SourceCitations";
import { AnswerInsights } from "./AnswerInsights";

interface Props {
  messages: Message[];
  loading: boolean;
  activity?: string;
  onFollowUp?: (question: string) => void;
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, idx) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          return (
            <a
              key={idx}
              href={`#source-${match[1]}`}
              className="mx-0.5 inline-block rounded bg-[#005BAC]/10 px-1 text-[#005BAC] hover:bg-[#005BAC]/20"
            >
              {part}
            </a>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

export function MessageList({ messages, loading, activity, onFollowUp }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const lastMessageIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    const last = messages[messages.length - 1];
    if (last?.id !== lastMessageIdRef.current) {
      if (last?.role === "USER") shouldAutoScrollRef.current = true;
      lastMessageIdRef.current = last?.id;
    }
    if (!container || !shouldAutoScrollRef.current) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
  }, [messages, loading]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 72;
  };

  const lastMessage = messages[messages.length - 1];
  const streamingAssistant =
    loading && lastMessage && lastMessage.role === "ASSISTANT";

  return (
    <div
      ref={containerRef}
      className="widget-message-list flex-1 overflow-y-auto p-3"
      onScroll={handleScroll}
    >
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Bot size={40} className="mb-3 text-[#005BAC]" />
          <h4 className="mb-1.5 text-base font-semibold text-gray-900">
            河海大学问答助手
          </h4>
          <p className="max-w-[220px] text-xs leading-relaxed text-gray-600">
            基于校园知识库，为你解答招生、教学、生活等各类问题
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const showStreamingLoader = streamingAssistant && isLast && !msg.content;
        return (
          <div
            key={msg.id}
            className={`widget-message-row mb-4 flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`widget-message-wrap flex max-w-[85%] gap-2 ${
                msg.role === "USER" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "USER"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-[#005BAC] text-white"
                }`}
              >
                {msg.role === "USER" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`widget-message-bubble max-w-[88%] rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
                  msg.role === "USER"
                    ? "bg-[#005BAC] text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {showStreamingLoader ? (
                  <span className="ai-activity">
                    <Loader size={14} className="animate-spin" />
                    {activity || "正在组织回答…"}
                  </span>
                ) : (
                  <>
                    <span className={streamingAssistant && isLast ? "typing-text" : ""}>
                      <MessageContent content={msg.content} />
                    </span>
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitations sources={msg.sources} />
                    )}
                    {msg.insight && (
                      <AnswerInsights
                        insight={msg.insight}
                        onSelect={onFollowUp}
                        disabled={loading}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {loading && !streamingAssistant && (
        <div className="mb-4 flex justify-start">
          <div className="flex max-w-[85%] gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#005BAC] text-white">
              <Bot size={14} />
            </div>
            <div className="rounded-2xl bg-gray-100 px-3 py-1.5 text-sm text-gray-800">
              <span className="ai-activity">
                <Loader size={14} className="animate-spin" />
                {activity || "正在组织回答…"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
