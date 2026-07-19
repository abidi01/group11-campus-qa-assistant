from typing import Any


def build_answer_insights(
    question: str, sources: list[dict[str, Any]]
) -> dict[str, object]:
    """Build explainability metadata without another model call.

    The score combines retrieval relevance and independent document coverage. It
    is deliberately presented as a retrieval-confidence hint, not a guarantee
    that the generated answer is factually correct.
    """
    scores = [max(0.0, min(1.0, float(source.get("score", 0)))) for source in sources]
    distinct_titles = {
        str(source.get("title", "")).strip()
        for source in sources
        if str(source.get("title", "")).strip()
    }

    if scores:
        top_score = max(scores)
        average_score = sum(scores[:3]) / min(len(scores), 3)
        coverage_bonus = min(len(distinct_titles), 3) / 3
        confidence_score = round(
            100 * (0.6 * top_score + 0.3 * average_score + 0.1 * coverage_bonus)
        )
    else:
        confidence_score = 0

    if confidence_score >= 70:
        level, label = "HIGH", "高可信"
    elif confidence_score >= 45:
        level, label = "MEDIUM", "中等可信"
    else:
        level, label = "LOW", "谨慎参考"

    if not scores:
        reason = "暂未检索到可核验的校本资料"
    elif len(distinct_titles) >= 2:
        reason = f"检索依据来自 {len(distinct_titles)} 份校本资料"
    else:
        reason = "基于 1 份校本资料，建议结合原文核对"

    follow_ups: list[str] = []
    normalized_question = question.lower()

    def add(candidate: str) -> None:
        if candidate not in follow_ups and candidate != question and len(follow_ups) < 3:
            follow_ups.append(candidate)

    if any(keyword in normalized_question for keyword in ("时间", "几点", "开放", "截止")):
        add("节假日或特殊日期的时间是否会调整？")
        add("在哪里可以查看最新通知？")
    if any(keyword in normalized_question for keyword in ("申请", "办理", "补办", "怎么", "流程")):
        add("办理这项事项需要准备哪些材料？")
        add("办理地点和服务时间是什么？")
    if any(keyword in normalized_question for keyword in ("费用", "多少钱", "收费", "缴费")):
        add("是否支持线上缴费，费用可以退还吗？")

    category = next(
        (
            str(source.get("category", "")).strip()
            for source in sources
            if str(source.get("category", "")).strip()
        ),
        "",
    )
    title = next(
        (
            str(source.get("title", "")).strip()
            for source in sources
            if str(source.get("title", "")).strip()
        ),
        "",
    )
    if category and category not in {"其他", "未分类"}:
        add(f"{category}还有哪些常见问题？")
    if title:
        add(f"请概括《{title}》中的关键注意事项。")
    add("如果情况特殊，应该联系哪个部门？")

    return {
        "confidence": {
            "score": confidence_score,
            "level": level,
            "label": label,
            "reason": reason,
        },
        "follow_up_questions": follow_ups,
    }
