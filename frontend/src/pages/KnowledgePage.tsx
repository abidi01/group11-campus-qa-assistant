import { useState, useEffect, useCallback, type DragEvent, type FormEvent } from "react";
import { useAuth } from "../context/auth-context";
import { api, type DocumentPage, type DocumentRecord } from "../api";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Loader,
  Database,
  Layers3,
  CircleCheck,
  Search,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  X,
  Check,
  CircleX,
  ExternalLink,
} from "lucide-react";

const EMPTY_PAGE: DocumentPage = {
  records: [],
  total: 0,
  page: 1,
  size: 10,
  document_total: 0,
  chunk_total: 0,
  ready_total: 0,
  processing_total: 0,
  pending_review_total: 0,
  error_total: 0,
};

const STAGE_LABEL: Record<string, string> = {
  QUEUED: "等待处理",
  EXTRACTING: "提取文本",
  INDEXING: "切分并向量化",
  DONE: "已写入向量库",
  FAILED: "处理失败",
  AWAITING_REVIEW: "等待管理员审核",
  REVIEW_REJECTED: "审核未通过",
};

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "md"];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function KnowledgePage() {
  const { token, isAdmin } = useAuth();
  const admin = isAdmin();
  const [result, setResult] = useState<DocumentPage>(EMPTY_PAGE);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchWorking, setBatchWorking] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTruncated, setPreviewTruncated] = useState(false);

  const loadDocuments = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const data = await api.documents.list(token, {
          page,
          size: 10,
          keyword: query.trim() || undefined,
          status: statusFilter || undefined,
          reviewStatus: reviewFilter || undefined,
        });
        setResult(data);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "文档列表加载失败");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, page, query, statusFilter, reviewFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => loadDocuments(), 250);
    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  useEffect(() => {
    if (result.processing_total <= 0) return;
    const timer = window.setInterval(() => loadDocuments(true), 3000);
    return () => window.clearInterval(timer);
  }, [result.processing_total, loadDocuments]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseFile = (selected: File | null) => {
    if (!selected) return;
    const extension = selected.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setNotice("仅支持 PDF、DOC、DOCX、TXT 和 Markdown 文件");
      return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setNotice("文件不能超过 50MB");
      return;
    }
    setNotice("");
    setFile(selected);
    if (!title.trim()) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0] || null);
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim() || !token) return;
    setUploading(true);
    setUploadProgress(0);
    setNotice("");
    try {
      await api.documents.upload(token, title.trim(), file, setUploadProgress);
      setTitle("");
      setFile(null);
      setPage(1);
      setNotice(
        admin
          ? "上传成功，文档已进入后台处理队列"
          : "上传成功，等待管理员审核通过后进入知识库",
      );
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: DocumentRecord) => {
    if (!token) return;
    try {
      const blob = await api.documents.download(token, document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "文件下载失败");
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewDocument(null);
    setPreviewText("");
    setPreviewUrl("");
    setPreviewTruncated(false);
  };

  const handlePreview = async (document: DocumentRecord) => {
    if (!token) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewDocument(document);
    setPreviewText("");
    setPreviewUrl("");
    setPreviewTruncated(false);
    setPreviewLoading(true);
    try {
      if (document.file_type.toLowerCase() === "pdf") {
        const blob = await api.documents.download(token, document.id);
        setPreviewUrl(URL.createObjectURL(blob));
      } else {
        const preview = await api.documents.preview(token, document.id);
        setPreviewText(preview.content);
        setPreviewTruncated(preview.truncated);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "文档预览失败");
      setPreviewDocument(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReview = async (
    document: DocumentRecord,
    decision: "APPROVED" | "REJECTED",
  ) => {
    if (!token || !admin) return;
    const note = decision === "REJECTED"
      ? prompt("请输入驳回原因（可选）", document.review_note || "")?.trim()
      : undefined;
    if (decision === "REJECTED" && note === undefined) return;
    try {
      await api.documents.review(token, document.id, decision, note);
      setNotice(
        decision === "APPROVED"
          ? `“${document.title}”已审核通过，正在建立知识索引`
          : `“${document.title}”已驳回`,
      );
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "审核失败");
    }
  };

  const toggleSelection = (documentId: number) => {
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  };

  const toggleCurrentPage = () => {
    const pageIds = result.records.map((document) => document.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds])),
    );
  };

  const handleBatchDelete = async () => {
    if (!token || selectedIds.length === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.length} 篇文档及其全部向量数据？`)) return;
    setBatchWorking(true);
    try {
      const result = await api.documents.batchDelete(token, selectedIds);
      setNotice(`已删除 ${result.count} 篇文档、原始文件和对应向量`);
      setSelectedIds([]);
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "批量删除失败");
    } finally {
      setBatchWorking(false);
    }
  };

  const handleBatchReprocess = async () => {
    if (!token || selectedIds.length === 0) return;
    setBatchWorking(true);
    try {
      const result = await api.documents.batchReprocess(token, selectedIds);
      setNotice(`已将 ${result.count} 篇文档重新加入处理队列`);
      setSelectedIds([]);
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "批量重新处理失败");
    } finally {
      setBatchWorking(false);
    }
  };

  const handleDelete = async (document: DocumentRecord) => {
    if (!token || !confirm(`确定删除“${document.title}”及其全部向量数据？`)) return;
    try {
      await api.documents.delete(token, document.id);
      setNotice("文档、原始文件和对应向量已删除");
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "删除失败");
    }
  };

  const handleReprocess = async (document: DocumentRecord) => {
    if (!token) return;
    try {
      await api.documents.reprocess(token, document.id);
      setNotice("已重新加入处理队列");
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "重新处理失败");
    }
  };

  const handleRename = async (document: DocumentRecord) => {
    if (!token) return;
    const nextTitle = prompt("修改文档标题（保存后会自动重建索引）", document.title)?.trim();
    if (!nextTitle || nextTitle === document.title) return;
    try {
      await api.documents.update(token, document.id, { title: nextTitle });
      setNotice("标题已更新，正在同步重建向量索引");
      await loadDocuments(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "更新失败");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const pageCount = Math.max(1, Math.ceil(result.total / result.size));

  return (
    <div className="admin-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">KNOWLEDGE ARCHIVE</span>
          <h1>知识库管理</h1>
          <p>
            {admin
              ? "审核用户投稿，审核通过后完成文本提取、切分和向量化入库。"
              : "可上传、查看和下载资料；投稿经管理员审核通过后进入知识库。"}
          </p>
        </div>
      </header>

      <section className={`metric-strip ${admin ? "four" : ""}`}>
        <div><Database size={20} /><span><b>{result.document_total}</b>资料总数</span></div>
        <div><CircleCheck size={20} /><span><b>{result.ready_total}</b>可检索文档</span></div>
        {admin && <div><Check size={20} /><span><b>{result.pending_review_total}</b>待审核投稿</span></div>}
        <div><Layers3 size={20} /><span><b>{result.chunk_total.toLocaleString()}</b>知识片段</span></div>
      </section>

      <form className="upload-form" onSubmit={handleUpload}>
        <div className="section-title">
          <div><span>{admin ? "资料入库" : "资料投稿"}</span><h2>添加新的知识来源</h2></div>
          <p>支持 PDF、DOC、DOCX、TXT、Markdown，单文件不超过 50MB</p>
        </div>
        <div className="upload-row">
          <input
            type="text"
            placeholder="输入资料标题"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <label
            className="file-picker"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <FileText size={18} />
            <span>{file ? file.name : "点击选择或拖拽文件到这里"}</span>
            <input
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
              required
            />
          </label>
          <button type="submit" disabled={uploading}>
            {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
            {uploading ? "上传中..." : "上传"}
          </button>
        </div>
        {uploading && (
          <div className="upload-progress-wrap" aria-live="polite">
            <div className="upload-progress" aria-label={`上传进度 ${uploadProgress}%`}>
              <span style={{ width: `${uploadProgress}%` }} />
            </div>
            <b>{uploadProgress}%</b>
          </div>
        )}
      </form>

      {notice && <div className="knowledge-notice">{notice}</div>}

      <div className="list-toolbar knowledge-toolbar">
        <div><h2>资料目录</h2><span>共 {result.total} 条匹配记录</span></div>
        <div className="knowledge-filters">
          <label className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="搜索标题或文件名"
            />
          </label>
          <select
            aria-label="按处理状态筛选"
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
          >
            <option value="">全部状态</option>
            <option value="PENDING">等待处理</option>
            <option value="PROCESSING">处理中</option>
            <option value="READY">已完成</option>
            <option value="ERROR">处理失败</option>
          </select>
          {admin && (
            <select
              aria-label="按审核状态筛选"
              value={reviewFilter}
              onChange={(event) => { setReviewFilter(event.target.value); setPage(1); }}
            >
              <option value="">全部审核状态</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">审核通过</option>
              <option value="REJECTED">审核未通过</option>
            </select>
          )}
        </div>
      </div>

      {admin && <div className="knowledge-batch-bar">
        <label>
          <input
            type="checkbox"
            checked={result.records.length > 0 && result.records.every((item) => selectedIds.includes(item.id))}
            onChange={toggleCurrentPage}
          />
          选择本页
        </label>
        <span>已选择 {selectedIds.length} 篇</span>
        <button disabled={selectedIds.length === 0 || batchWorking} onClick={handleBatchReprocess}>
          <RefreshCw size={14} />批量重新处理
        </button>
        <button className="danger" disabled={selectedIds.length === 0 || batchWorking} onClick={handleBatchDelete}>
          <Trash2 size={14} />批量删除
        </button>
      </div>}

      {loading ? (
        <div className="loading"><Loader size={24} className="spin" /> 加载中...</div>
      ) : (
        <div className="document-list">
          {result.records.length === 0 && <p className="empty">没有找到匹配的资料</p>}
          {result.records.map((document) => {
            const busy = document.review_status === "APPROVED"
              && ["PENDING", "PROCESSING"].includes(document.status);
            const statusLabel = document.review_status === "PENDING"
              ? "待管理员审核"
              : document.review_status === "REJECTED"
                ? "审核未通过"
                : document.status === "READY"
                  ? "已完成"
                  : document.status === "ERROR"
                    ? "处理失败"
                    : document.status === "PENDING" ? "等待处理" : "处理中";
            const statusClass = document.review_status === "APPROVED"
              ? document.status.toLowerCase()
              : `review-${document.review_status.toLowerCase()}`;
            return (
              <div key={document.id} className="document-card">
                {admin && <label className="doc-selector" title="选择文档">
                  <input
                    type="checkbox"
                    aria-label={`选择 ${document.title}`}
                    checked={selectedIds.includes(document.id)}
                    onChange={() => toggleSelection(document.id)}
                  />
                </label>}
                <div className="doc-info">
                  <span className="doc-icon"><FileText size={19} /></span>
                  <div className="doc-meta">
                    <span className="doc-title">{document.title}</span>
                    <span className="doc-detail">
                      {document.filename} · {document.file_type.toUpperCase()} · {formatSize(document.size)} · {document.chunk_count} 片段
                    </span>
                    {admin && document.uploader_name && (
                      <span className="doc-uploader">上传者：{document.uploader_name}</span>
                    )}
                    <span className="doc-stage">{STAGE_LABEL[document.processing_stage] || document.processing_stage}</span>
                    {document.source_url && (
                      <a className="doc-source-link" href={document.source_url} target="_blank" rel="noreferrer">
                        网页来源<ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <span className={`doc-status ${statusClass}`}>{statusLabel}</span>
                </div>
                <div className="doc-actions">
                  <button onClick={() => handlePreview(document)} title="预览"><Eye size={14} /></button>
                  <button onClick={() => handleDownload(document)} title="下载原文件"><Download size={14} /></button>
                  {admin && document.review_status !== "APPROVED" && (
                    <>
                      <button className="approve" onClick={() => handleReview(document, "APPROVED")} title="审核通过"><Check size={14} /></button>
                      <button className="reject" onClick={() => handleReview(document, "REJECTED")} title="驳回投稿"><CircleX size={14} /></button>
                    </>
                  )}
                  {admin && document.review_status === "APPROVED" && (
                    <>
                      <button disabled={busy} onClick={() => handleRename(document)} title="编辑标题"><Pencil size={14} /></button>
                      <button disabled={busy} onClick={() => handleReprocess(document)} title="重新处理"><RefreshCw size={14} /></button>
                    </>
                  )}
                  {admin && <button disabled={busy} onClick={() => handleDelete(document)} title="删除"><Trash2 size={14} /></button>}
                </div>
                {document.review_status === "REJECTED" && document.review_note && (
                  <div className="doc-review-note">驳回原因：{document.review_note}</div>
                )}
                {document.error && <div className="doc-error">{document.error}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="knowledge-pagination">
        <span>第 {page} / {pageCount} 页</span>
        <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} />上一页</button>
        <button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>下一页<ChevronRight size={15} /></button>
      </div>

      {previewDocument && (
        <div className="document-preview-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePreview();
        }}>
          <section className="document-preview" role="dialog" aria-modal="true" aria-label={`预览 ${previewDocument.title}`}>
            <header>
              <div>
                <small>DOCUMENT PREVIEW</small>
                <h2>{previewDocument.title}</h2>
                <span>{previewDocument.filename}</span>
              </div>
              <button onClick={closePreview} aria-label="关闭预览"><X size={18} /></button>
            </header>
            <div className="document-preview-body">
              {previewLoading ? (
                <div className="loading"><Loader size={22} className="spin" /> 正在加载预览...</div>
              ) : previewUrl ? (
                <iframe title={previewDocument.title} src={previewUrl} />
              ) : (
                <pre>{previewText || "该文档没有可显示的文本内容"}</pre>
              )}
            </div>
            <footer>
              {previewTruncated && <span>内容较长，预览仅展示前 30 万字符</span>}
              <button onClick={() => handleDownload(previewDocument)}><Download size={14} />下载原文件</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
