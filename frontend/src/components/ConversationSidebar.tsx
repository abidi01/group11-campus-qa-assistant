import { useEffect, useState, type MouseEvent } from "react";
import { Clock3, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import type { Conversation } from "../store/chatStore";

interface Props {
  conversations: Conversation[];
  currentId: number | undefined;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
}

export function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  keyword,
  onKeywordChange,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const openContextMenu = (event: MouseEvent, id: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ id, x: event.clientX, y: event.clientY });
  };

  const confirmDelete = (id: number) => {
    setContextMenu(null);
    if (window.confirm("确定删除这个历史会话及其全部问答记录吗？")) {
      onDelete(id);
    }
  };

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  return (
    <aside className="widget-history">
      <div className="widget-history-head">
        <button onClick={onNew} className="widget-new-chat">
          <Plus size={14} />
          新对话
        </button>
        <label className="widget-history-search">
          <Search size={12} />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索历史问答"
            aria-label="搜索历史问答"
          />
        </label>
      </div>
      <div className="widget-history-list">
        {conversations.length === 0 && (
          <p className="p-2 text-center text-xs text-gray-400">
            {keyword ? "没有匹配的历史问答" : "暂无历史对话"}
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            onContextMenu={(event) => openContextMenu(event, conv.id)}
            className={`widget-history-item mb-1 cursor-pointer rounded-lg px-1.5 py-1.5 text-xs ${
              currentId === conv.id
                ? "bg-[#005BAC]/10 text-[#005BAC]"
                : "text-gray-700 hover:bg-gray-200"
            }`}
            title="点击查看完整会话，右键删除"
          >
            <div className="widget-history-title">
              <MessageSquare size={12} />
              <span title={conv.title}>{conv.title}</span>
            </div>
            <small>
              <Clock3 size={10} /> {formatTime(conv.updated_at)} · {conv.message_count} 条
            </small>
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
            confirmDelete(contextMenu.id);
          }}
        >
          <Trash2 size={13} /> 删除会话
        </button>
      )}
    </aside>
  );
}
