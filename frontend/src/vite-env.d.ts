/// <reference types="vite/client" />

interface Window {
  __HHU_CHAT_API_BASE__?: string;
  __HHU_CHAT_PRIMARY_COLOR__?: string;
  HHUChat?: {
    init: (config?: import("./widget").HHUChatConfig) => void;
    destroy: () => void;
  };
}

declare module "*.css?inline" {
  const content: string;
  export default content;
}
