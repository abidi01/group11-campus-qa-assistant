"""Day6 production smoke test: health -> login -> synchronous RAG -> history."""

from __future__ import annotations

import argparse
import sys

import httpx

from captcha_prompt import captcha_login


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000/api")
    parser.add_argument("--email", default="admin@campus.example")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--question", default="河海大学的校训是什么？")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    # 绕过系统 HTTP 代理，避免 localhost 验收请求被代理错误拦截。
    with httpx.Client(base_url=base_url, timeout=90, trust_env=False) as client:
        health = client.get("/health")
        health.raise_for_status()

        login = captcha_login(client, args.email, args.password)
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['token']}"}

        answer = client.post(
            "/chat",
            headers=headers,
            json={"question": args.question},
        )
        answer.raise_for_status()
        payload = answer.json()
        if not payload.get("answer") or not isinstance(payload.get("sources"), list):
            raise RuntimeError("问答响应缺少 answer 或 sources")

        history = client.get("/conversations", headers=headers)
        history.raise_for_status()
        if not any(
            item["id"] == payload["conversation_id"] for item in history.json()
        ):
            raise RuntimeError("问答记录未写入历史会话")

    print("PASS health -> login -> RAG answer -> history")
    print(f"conversation_id={payload['conversation_id']}")
    print(f"sources={len(payload['sources'])}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
