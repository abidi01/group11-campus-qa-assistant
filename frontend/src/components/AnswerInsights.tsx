import { AlertTriangle, Compass, ShieldCheck } from "lucide-react";
import type { AnswerInsight } from "../api";

interface Props {
  insight: AnswerInsight;
  onSelect?: (question: string) => void;
  disabled?: boolean;
}

export function AnswerInsights({ insight, onSelect, disabled }: Props) {
  const { confidence, follow_up_questions: followUps } = insight;

  return (
    <section className={`answer-insight level-${confidence.level.toLowerCase()}`}>
      <div className="answer-confidence">
        <span className="confidence-icon">
          {confidence.level === "LOW" ? (
            <AlertTriangle size={14} />
          ) : (
            <ShieldCheck size={14} />
          )}
        </span>
        <div className="confidence-copy">
          <strong>{confidence.label}</strong>
          <span>{confidence.reason}</span>
        </div>
        <b>{confidence.score}</b>
      </div>
      <div className="confidence-track" aria-label={`检索可信度 ${confidence.score} 分`}>
        <span style={{ width: `${confidence.score}%` }} />
      </div>

      {followUps.length > 0 && (
        <div className="follow-up-panel">
          <p>
            <Compass size={13} /> 继续探索
          </p>
          <div>
            {followUps.map((question) => (
              <button
                type="button"
                key={question}
                disabled={disabled || !onSelect}
                onClick={() => onSelect?.(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
