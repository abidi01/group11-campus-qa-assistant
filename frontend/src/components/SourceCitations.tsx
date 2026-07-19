import { useState } from "react";
import type { Source } from "../store/chatStore";

interface Props {
  sources: Source[];
}

export function SourceCitations({ sources }: Props) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 border-t border-gray-200 pt-2">
      <p className="mb-1 text-xs font-medium text-gray-500">参考来源</p>
      <div className="space-y-1.5">
        {sources.map((s) => (
          <SourceCard key={s.index} source={s} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  const hasLongContent = source.content && source.content.length > 80;

  return (
    <div
      id={`source-${source.index}`}
      className="widget-source-card cursor-pointer rounded-lg border border-gray-100 bg-white p-2 text-xs transition hover:border-gray-200 hover:shadow-sm"
      onClick={() => hasLongContent && setExpanded((v) => !v)}
      title={hasLongContent ? (expanded ? "点击收起" : "点击展开完整内容") : undefined}
    >
      <div className="widget-source-heading mb-1 flex items-center gap-2">
        <span className="rounded bg-[#005BAC]/10 px-1 font-medium text-[#005BAC]">
          [{source.index}]
        </span>
        {source.source_url ? (
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="widget-source-title font-medium text-[#005BAC] hover:underline"
            title={source.category || ""}
            onClick={(e) => e.stopPropagation()}
          >
            {source.title}
          </a>
        ) : (
          <span
            className="widget-source-title font-medium text-gray-700"
            title={source.category || ""}
          >
            {source.title}
          </span>
        )}
        <span className="widget-source-score ml-auto text-gray-400">
          相关度: {(source.score * 100).toFixed(1)}%
        </span>
      </div>
      <p
        className={`text-gray-500 ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {source.content}
      </p>
      {hasLongContent && (
        <p className="mt-1 text-[10px] text-[#005BAC]">
          {expanded ? "收起 ↑" : "展开更多 ↓"}
        </p>
      )}
    </div>
  );
}
