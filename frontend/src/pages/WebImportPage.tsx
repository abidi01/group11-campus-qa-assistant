import { useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  FileEdit,
  FileText,
  Globe2,
  Loader,
  RefreshCw,
  Send,
} from "lucide-react";
import { api, type DocumentRecord, type WebDocumentDraft } from "../api";
import { useAuth } from "../context/auth-context";

interface WebImportPageProps {
  onGoKnowledge: () => void;
}

export function WebImportPage({ onGoKnowledge }: WebImportPageProps) {
  const { token, isAdmin } = useAuth();
  const admin = isAdmin();
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<WebDocumentDraft | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState<DocumentRecord | null>(null);
  const submitLock = useRef(false);

  const generate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!token || !url.trim() || generating) return;
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const result = await api.webDocuments.generate(token, url.trim());
      setDraft(result);
      setUrl(result.source_url);
      setMode("edit");
      setSubmitted(null);
      setNotice(
        result.truncated
          ? "AI 已生成草稿，但输出达到长度限制，请检查文档末尾是否完整。"
          : "AI 已完成联网读取，知识文档草稿已生成。",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "网页读取失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const exportWord = async () => {
    if (!token || !draft || exporting) return;
    setExporting(true);
    setError("");
    try {
      const blob = await api.webDocuments.exportWord(token, draft);
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${draft.title.replace(/[\\/:*?"<>|]/g, "-") || "网页知识文档"}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      setNotice("Word 文档已导出。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Word 导出失败");
    } finally {
      setExporting(false);
    }
  };

  const submit = async () => {
    if (!token || !draft || submitting || submitted || submitLock.current) return;
    if (draft.title.trim().length < 2 || draft.markdown.trim().length < 20) {
      setError("标题至少 2 个字符，正文至少 20 个字符。");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setError("");
    try {
      const record = await api.webDocuments.submit(token, {
        title: draft.title.trim(),
        markdown: draft.markdown.trim(),
        source_url: draft.source_url,
      });
      setSubmitted(record);
      setNotice(admin ? "已提交并开始建立知识索引。" : "已提交，等待管理员审核。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败，请稍后重试");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    setUrl("");
    setDraft(null);
    setSubmitted(null);
    setNotice("");
    setError("");
    setMode("edit");
  };

  return (
    <div className="admin-page web-import-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">WEB KNOWLEDGE COLLECTOR</span>
          <h1>网页采集</h1>
          <p>将公开网址交给 AI 联网读取，并整理成可编辑、可追溯的知识文档。</p>
        </div>
      </header>

      <form className="web-url-panel" onSubmit={generate}>
        <div className="section-title">
          <div><span>网页来源</span><h2>输入需要整理的网址</h2></div>
          <p>由支持网页抓取的 AI 模型联网访问公开 HTTP / HTTPS 页面</p>
        </div>
        <div className="web-url-row">
          <Globe2 size={20} />
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/campus-service"
            disabled={generating || Boolean(submitted)}
            required
          />
          <button type="submit" disabled={generating || Boolean(submitted)}>
            {generating ? <Loader size={17} className="spin" /> : <Bot size={17} />}
            {generating ? "AI 正在读取..." : draft ? "重新生成" : "AI 读取并生成"}
          </button>
        </div>
        {generating && (
          <div className="web-generation-status" role="status">
            <span><i className="active" />AI 访问指定网址</span>
            <span><i className="active" />AI 提炼内容</span>
            <span><i />生成 Markdown 草稿</span>
          </div>
        )}
      </form>

      {error && <div className="web-feedback error">{error}{!draft && <button onClick={() => void generate()}>重试</button>}</div>}
      {notice && <div className="web-feedback success"><CheckCircle2 size={16} />{notice}</div>}

      {draft && (
        <section className="web-draft-panel">
          <div className="web-draft-head">
            <div>
              <span>AI GENERATED DRAFT</span>
              <h2>知识文档草稿</h2>
              <a href={draft.source_url} target="_blank" rel="noreferrer">
                {draft.source_title}<ExternalLink size={13} />
              </a>
            </div>
            <div className="web-draft-tools">
              <button className={mode === "edit" ? "active" : ""} onClick={() => setMode("edit")}>
                <FileEdit size={15} />编辑
              </button>
              <button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>
                <FileText size={15} />Word 预览
              </button>
              <button onClick={() => void exportWord()} disabled={exporting}>
                {exporting ? <Loader size={15} className="spin" /> : <Download size={15} />}
                导出 Word
              </button>
            </div>
          </div>

          {mode === "edit" ? (
            <div className="web-editor">
              <label>
                <span>文档标题</span>
                <input
                  value={draft.title}
                  disabled={Boolean(submitted)}
                  maxLength={120}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </label>
              <label>
                <span>Markdown 正文</span>
                <textarea
                  value={draft.markdown}
                  disabled={Boolean(submitted)}
                  onChange={(event) => setDraft({ ...draft, markdown: event.target.value })}
                  spellCheck={false}
                />
              </label>
            </div>
          ) : (
            <div className="word-preview-shell">
              <article className="word-paper">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
                  }}
                >
                  {draft.markdown}
                </ReactMarkdown>
              </article>
            </div>
          )}

          <div className="web-submit-bar">
            <div>
              <strong>{admin ? "管理员提交后将直接进入知识库" : "普通用户提交后由管理员审核"}</strong>
              <span>系统将保留原网页地址，方便后续核验资料来源。</span>
            </div>
            {submitted ? (
              <div className="web-submitted-actions">
                <button onClick={startAnother}><RefreshCw size={15} />继续采集</button>
                <button className="primary" onClick={onGoKnowledge}><FileText size={15} />前往知识库</button>
              </div>
            ) : (
              <button className="web-submit-button" onClick={() => void submit()} disabled={submitting}>
                {submitting ? <Loader size={17} className="spin" /> : <Send size={17} />}
                {submitting ? "正在提交..." : admin ? "提交并直接入库" : "提交到知识库审核"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
