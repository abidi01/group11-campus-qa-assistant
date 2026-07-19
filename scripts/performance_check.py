"""Day6 lightweight API performance baseline for a running deployment."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import math
from statistics import median
import time

import httpx

from captcha_prompt import captcha_login


def percentile(values: list[float], ratio: float) -> float:
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(len(ordered) * ratio) - 1))
    return ordered[index]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000/api")
    parser.add_argument("--email", default="admin@campus.example")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--requests", type=int, default=30)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--p95-limit-ms", type=float, default=1000)
    args = parser.parse_args()

    if args.requests < 1 or args.concurrency < 1:
        parser.error("requests 和 concurrency 必须大于 0")

    base_url = args.base_url.rstrip("/")
    # 本地验收不能继承系统 HTTP 代理，否则 localhost 可能被代理拦截为 502。
    with httpx.Client(base_url=base_url, timeout=15, trust_env=False) as client:
        login = captcha_login(client, args.email, args.password)
        login.raise_for_status()
        token = login.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    def request_once() -> tuple[int, float]:
        started = time.perf_counter()
        with httpx.Client(base_url=base_url, timeout=15, trust_env=False) as client:
            response = client.get("/documents?size=10", headers=headers)
        return response.status_code, (time.perf_counter() - started) * 1000

    latencies: list[float] = []
    errors = 0
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(request_once) for _ in range(args.requests)]
        for future in as_completed(futures):
            status, latency = future.result()
            latencies.append(latency)
            errors += int(status != 200)

    p50 = median(latencies)
    p95 = percentile(latencies, 0.95)
    print(
        f"requests={args.requests} concurrency={args.concurrency} "
        f"errors={errors} p50_ms={p50:.1f} p95_ms={p95:.1f}"
    )
    if errors or p95 > args.p95_limit_ms:
        print(f"FAIL: error_count={errors}, p95_limit_ms={args.p95_limit_ms:.1f}")
        return 1
    print("PASS: API performance baseline")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
