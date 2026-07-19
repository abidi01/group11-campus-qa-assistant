const getApiBase = () =>
  (typeof window !== "undefined" && window.__HHU_CHAT_API_BASE__) ||
  import.meta.env.VITE_API_BASE ||
  "/api";

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}
export interface AuthResponse {
  token: string;
  user: ApiUser;
}
export interface CaptchaResponse {
  captcha_id: string;
  image: string;
  expires_in: number;
}
export interface UserPage {
  records: ApiUser[];
  total: number;
  page: number;
  size: number;
  active_total: number;
  admin_total: number;
}
export interface ConversationRecord {
  id: number;
  title: string;
  updated_at: string;
  message_count: number;
}
export interface SourceRecord {
  index: number;
  title: string;
  content: string;
  score: number;
  source_url?: string;
  category?: string;
}
export interface AnswerInsight {
  confidence: {
    score: number;
    level: "HIGH" | "MEDIUM" | "LOW";
    label: string;
    reason: string;
  };
  follow_up_questions: string[];
}
export interface MessageRecord {
  id: number;
  role: "USER" | "ASSISTANT";
  content: string;
  sources?: SourceRecord[];
  confidence?: AnswerInsight["confidence"];
  follow_up_questions?: string[];
}
export interface ConversationDetail extends ConversationRecord {
  messages: MessageRecord[];
}
export interface DocumentRecord {
  id: number;
  title: string;
  filename: string;
  status: string;
  processing_stage: string;
  file_type: string;
  chunk_count: number;
  size: number;
  created_at: string;
  error: string | null;
  review_status: "PENDING" | "APPROVED" | "REJECTED";
  reviewed_at: string | null;
  review_note: string | null;
  uploaded_by: number;
  uploader_name?: string;
  source_url?: string;
  category?: string;
}
export interface WebDocumentDraft {
  title: string;
  markdown: string;
  source_url: string;
  source_title: string;
  fetched_at: string;
  truncated: boolean;
}
export interface DocumentPage {
  records: DocumentRecord[];
  total: number;
  page: number;
  size: number;
  document_total: number;
  chunk_total: number;
  ready_total: number;
  processing_total: number;
  pending_review_total: number;
  error_total: number;
}

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const base = getApiBase().replace(/\/$/, "");
  const url = `${base}${path}`;
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "请求失败" }));
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("campus-qa-unauthorized"));
    }
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join("；")
      : data.detail;
    throw new Error(detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetchApi("/health"),

  captcha: () => fetchApi<CaptchaResponse>("/auth/captcha"),

  login: (email: string, password: string, captchaId: string, captchaCode: string) =>
    fetchApi<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        captcha_id: captchaId,
        captcha_code: captchaCode,
      }),
    }),

  guestLogin: () =>
    fetchApi<AuthResponse>("/auth/guest", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  register: (name: string, email: string, password: string) =>
    fetchApi<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  me: (token: string) => fetchApi<ApiUser>("/auth/me", { token }),

  stats: (token: string) =>
    fetchApi<{ documents: number; chunks: number; conversations: number }>(
      "/stats",
      { token },
    ),

  documents: {
    list: (
      token: string,
      params: {
        page?: number;
        size?: number;
        keyword?: string;
        status?: string;
        reviewStatus?: string;
      } = {},
    ) => {
      const query = new URLSearchParams();
      query.set("page", String(params.page ?? 1));
      query.set("size", String(params.size ?? 10));
      if (params.keyword) query.set("keyword", params.keyword);
      if (params.status) query.set("status", params.status);
      if (params.reviewStatus) query.set("review_status", params.reviewStatus);
      return fetchApi<DocumentPage>(`/documents?${query.toString()}`, { token });
    },
    upload: (
      token: string,
      title: string,
      file: File,
      onProgress?: (percent: number) => void,
    ) => {
      const form = new FormData();
      form.append("title", title);
      form.append("file", file);
      return new Promise<DocumentRecord>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const base = getApiBase().replace(/\/$/, "");
        xhr.open("POST", `${base}/documents`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        };
        xhr.onload = () => {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(xhr.responseText || "{}");
          } catch {
            data = {};
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100);
            resolve(data as unknown as DocumentRecord);
            return;
          }
          if (xhr.status === 401) {
            window.dispatchEvent(new Event("campus-qa-unauthorized"));
          }
          const detail = data.detail;
          reject(new Error(typeof detail === "string" ? detail : `上传失败（HTTP ${xhr.status}）`));
        };
        xhr.onerror = () => reject(new Error("上传失败，请检查网络连接"));
        xhr.onabort = () => reject(new Error("上传已取消"));
        xhr.send(form);
      });
    },
    delete: (token: string, id: number) =>
      fetchApi<null>(`/documents/${id}`, { method: "DELETE", token }),
    reprocess: (token: string, id: number) =>
      fetchApi<DocumentRecord>(`/documents/${id}/reprocess`, {
        method: "POST",
        token,
      }),
    review: (
      token: string,
      id: number,
      decision: "APPROVED" | "REJECTED",
      note?: string,
    ) =>
      fetchApi<DocumentRecord>(`/documents/${id}/review`, {
        method: "POST",
        token,
        body: JSON.stringify({ decision, note: note || null }),
      }),
    update: (token: string, id: number, data: { title?: string; category?: string }) =>
      fetchApi<DocumentRecord>(`/documents/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
      }),
    preview: (token: string, id: number) =>
      fetchApi<{ kind: "pdf" | "text"; content: string; truncated: boolean }>(
        `/documents/${id}/preview`,
        { token },
      ),
    download: async (token: string, id: number) => {
      const base = getApiBase().replace(/\/$/, "");
      const response = await fetch(`${base}/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: "文件下载失败" }));
        throw new Error(data.detail || `HTTP ${response.status}`);
      }
      return response.blob();
    },
    batchDelete: (token: string, ids: number[]) =>
      fetchApi<{ deleted_ids: number[]; count: number }>("/documents/batch/delete", {
        method: "POST",
        token,
        body: JSON.stringify({ ids }),
      }),
    batchReprocess: (token: string, ids: number[]) =>
      fetchApi<{ queued_ids: number[]; count: number }>("/documents/batch/reprocess", {
        method: "POST",
        token,
        body: JSON.stringify({ ids }),
      }),
  },

  webDocuments: {
    generate: (token: string, url: string) =>
      fetchApi<WebDocumentDraft>("/web-documents/generate", {
        method: "POST",
        token,
        body: JSON.stringify({ url }),
      }),
    submit: (
      token: string,
      data: { title: string; markdown: string; source_url: string },
    ) =>
      fetchApi<DocumentRecord>("/web-documents/submit", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    exportWord: async (
      token: string,
      data: { title: string; markdown: string; source_url: string },
    ) => {
      const apiBase = getApiBase().replace(/\/$/, "");
      const response = await fetch(`${apiBase}/web-documents/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({ detail: "Word 导出失败" }));
        throw new Error(detail.detail || `HTTP ${response.status}`);
      }
      return response.blob();
    },
  },

  search: (token: string, question: string, topK = 5) =>
    fetchApi<{ question: string; results: SourceRecord[] }>("/search", {
      method: "POST",
      token,
      body: JSON.stringify({ question, top_k: topK }),
    }),

  chat: {
    ask: (
      token: string,
      question: string,
      conversationId?: number,
    ) =>
      fetchApi<{
        answer: string;
        sources: SourceRecord[];
        conversation_id: number;
      }>("/chat", {
        method: "POST",
        token,
        body: JSON.stringify({
          question,
          conversation_id: conversationId,
        }),
      }),
    stream: async (
      token: string,
      question: string,
      conversationId?: number,
      signal?: AbortSignal,
    ) => {
      const url = `${getApiBase()}/chat/stream`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          conversation_id: conversationId,
        }),
        signal,
      });
      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ detail: "问答请求失败" }));
        if (response.status === 401 && typeof window !== "undefined") {
          window.dispatchEvent(new Event("campus-qa-unauthorized"));
        }
        throw new Error(data.detail || `HTTP ${response.status}`);
      }
      return response;
    },
  },

  conversations: {
    list: (token: string, keyword = "") => {
      const query = keyword.trim()
        ? `?keyword=${encodeURIComponent(keyword.trim())}`
        : "";
      return fetchApi<ConversationRecord[]>(`/conversations${query}`, { token });
    },
    get: (token: string, id: number) =>
      fetchApi<ConversationDetail>(`/conversations/${id}`, { token }),
    delete: (token: string, id: number) =>
      fetchApi<null>(`/conversations/${id}`, { method: "DELETE", token }),
    update: (token: string, id: number, title: string) =>
      fetchApi<ConversationRecord>(`/conversations/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ title }),
      }),
  },

  users: {
    list: (
      token: string,
      params: {
        page?: number;
        size?: number;
        keyword?: string;
        role?: string;
        isActive?: boolean;
      } = {},
    ) => {
      const query = new URLSearchParams();
      query.set("page", String(params.page ?? 1));
      query.set("size", String(params.size ?? 10));
      if (params.keyword) query.set("keyword", params.keyword);
      if (params.role) query.set("role", params.role);
      if (params.isActive !== undefined) {
        query.set("is_active", String(params.isActive));
      }
      return fetchApi<UserPage>(`/users?${query.toString()}`, { token });
    },
    create: (
      token: string,
      data: { name: string; email: string; password: string; role: string },
    ) =>
      fetchApi<ApiUser>("/users", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    update: (
      token: string,
      id: number,
      data: { name?: string; email?: string; role?: string; is_active?: boolean },
    ) =>
      fetchApi<ApiUser>(`/users/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchApi<null>(`/users/${id}`, { method: "DELETE", token }),
  },
};
