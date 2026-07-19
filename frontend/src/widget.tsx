// Polyfill process for dependencies that reference it unconditionally.
const runtimeGlobal = globalThis as typeof globalThis & {
  process?: { env: { NODE_ENV: string } };
};
if (typeof runtimeGlobal.process === "undefined") {
  runtimeGlobal.process = { env: { NODE_ENV: "production" } };
}

import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { ChatWidget } from "./components/ChatWidget";
import widgetCss from "./index.css?inline";

export interface HHUChatConfig {
  apiBaseUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  quickQuestions?: string[];
  position?: "bottom-right" | "bottom-left";
}

function init(config: HHUChatConfig = {}) {
  const hostId = "hhu-chat-widget-host";
  if (document.getElementById(hostId)) return;

  const host = document.createElement("div");
  host.id = hostId;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = widgetCss;
  shadow.appendChild(style);

  // 隔离宿主页面的 root font-size，避免 rem 单位被异常放大/缩小
  const reset = document.createElement("style");
  reset.textContent = `
    :host {
      --spacing: 4px !important;
      --text-xs: 12px !important;
      --text-sm: 14px !important;
      --text-base: 16px !important;
      --text-lg: 18px !important;
      --text-xl: 20px !important;
      --text-2xl: 24px !important;
      --text-3xl: 30px !important;
      --radius-sm: 2px !important;
      --radius-md: 6px !important;
      --radius-lg: 8px !important;
      --radius-xl: 12px !important;
      --radius-2xl: 16px !important;
      --radius-3xl: 24px !important;
      --default-font-family: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif !important;
    }
  `;
  shadow.appendChild(reset);

  const container = document.createElement("div");
  container.id = "hhu-chat-widget-root";
  shadow.appendChild(container);

  if (config.apiBaseUrl) {
    window.__HHU_CHAT_API_BASE__ = config.apiBaseUrl;
  }
  if (config.primaryColor) {
    window.__HHU_CHAT_PRIMARY_COLOR__ = config.primaryColor;
  }

  const root = createRoot(container);
  root.render(
    <AuthProvider>
      <ChatWidget />
    </AuthProvider>,
  );
}

function destroy() {
  const host = document.getElementById("hhu-chat-widget-host");
  if (host) {
    host.remove();
  }
}

const HHUChat = { init, destroy };

window.HHUChat = HHUChat;

export default HHUChat;
