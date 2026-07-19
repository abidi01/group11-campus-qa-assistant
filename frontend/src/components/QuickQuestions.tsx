const QUESTIONS = [
  "河海大学的校训是什么？",
  "图书馆开放时间？",
  "校园卡怎么补办？",
  "奖学金申请条件？",
  "学校地址在哪里？",
];

interface Props {
  onSelect: (text: string) => void;
}

export function QuickQuestions({ onSelect }: Props) {
  return (
    <div className="quick-questions border-t bg-gray-50 px-3 py-2">
      <p className="mb-1.5 text-[10px] text-gray-500">快捷问题</p>
      <div className="flex flex-wrap gap-1.5">
        {QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border border-[#005BAC]/20 bg-white px-3 py-1 text-xs text-[#005BAC] transition-colors hover:bg-[#005BAC]/10"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
