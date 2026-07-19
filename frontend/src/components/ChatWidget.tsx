import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { X, Bot } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { ChatWindow } from "./ChatWindow";

export function ChatWidget() {
  const { isOpen, toggle } = useChatStore();
  const [windowWidth, setWindowWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem("hhu-chat-widget-width"));
    return Number.isFinite(saved) && saved > 0 ? saved : 680;
  });
  const resizeStart = useRef<{ x: number; width: number } | null>(null);

  const clampWidth = (width: number) =>
    Math.max(420, Math.min(width, Math.min(960, window.innerWidth - 32)));

  const saveWidth = (width: number) => {
    const nextWidth = clampWidth(width);
    setWindowWidth(nextWidth);
    window.localStorage.setItem("hhu-chat-widget-width", String(nextWidth));
  };

  const startResize = (event: PointerEvent<HTMLButtonElement>) => {
    resizeStart.current = { x: event.clientX, width: windowWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resize = (event: PointerEvent<HTMLButtonElement>) => {
    if (!resizeStart.current) return;
    setWindowWidth(
      clampWidth(
        resizeStart.current.width + resizeStart.current.x - event.clientX,
      ),
    );
  };

  const finishResize = (event: PointerEvent<HTMLButtonElement>) => {
    if (!resizeStart.current) return;
    resizeStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    window.localStorage.setItem("hhu-chat-widget-width", String(windowWidth));
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      saveWidth(windowWidth + 32);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      saveWidth(windowWidth - 32);
    }
  };

  return (
    <div className="widget-dock">
      {isOpen && (
        <div
          className="widget-resizable"
          style={{ width: clampWidth(windowWidth) }}
        >
          <button
            type="button"
            className="widget-resize-handle"
            aria-label="拖动调整问答窗口宽度"
            title="向左拖动放大，向右拖动缩小"
            onPointerDown={startResize}
            onPointerMove={resize}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            onKeyDown={resizeWithKeyboard}
          >
            <span />
          </button>
          <ChatWindow onClose={() => useChatStore.getState().setIsOpen(false)} />
        </div>
      )}
      <button
        onClick={toggle}
        className={`widget-trigger ${isOpen ? "open" : ""}`}
        aria-label={isOpen ? "关闭问答助手" : "打开问答助手"}
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.5} />
        ) : (
          <Bot size={28} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
