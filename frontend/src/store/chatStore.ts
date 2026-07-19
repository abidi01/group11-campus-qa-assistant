import { create } from "zustand";
import type { AnswerInsight } from "../api";

export interface Source {
  index: number;
  title: string;
  content: string;
  score: number;
  source_url?: string;
  category?: string;
}

export interface Message {
  id: number;
  role: "USER" | "ASSISTANT";
  content: string;
  sources?: Source[];
  insight?: AnswerInsight;
}

export interface Conversation {
  id: number;
  title: string;
  updated_at: string;
  message_count: number;
}

interface ChatState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateAssistantMessage: (
    id: number,
    content: string,
    sources?: Source[],
    insight?: AnswerInsight,
  ) => void;
  clearMessages: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  currentId: number | undefined;
  setCurrentId: (id: number | undefined) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateAssistantMessage: (id, content, sources, insight) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content, sources, insight } : m,
      ),
    })),
  clearMessages: () => set({ messages: [], currentId: undefined }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  currentId: undefined,
  setCurrentId: (id) => set({ currentId: id }),
}));
