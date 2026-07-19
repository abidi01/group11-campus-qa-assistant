from __future__ import annotations

from base64 import b64decode
from pathlib import Path
import tempfile
import webbrowser

import httpx


def captcha_login(
    client: httpx.Client, email: str, password: str
) -> httpx.Response:
    """Open the graphical captcha locally and prompt for its value."""
    captcha = client.get("/auth/captcha")
    captcha.raise_for_status()
    payload = captcha.json()
    prefix = "data:image/png;base64,"
    image = str(payload["image"])
    if not image.startswith(prefix):
        raise RuntimeError("验证码图片格式无效")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write(b64decode(image.removeprefix(prefix)))
    try:
        webbrowser.open(temp_path.as_uri())
        code = input("请输入弹出图片中的 4 位验证码：").strip()
    finally:
        temp_path.unlink(missing_ok=True)

    return client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
            "captcha_id": payload["captcha_id"],
            "captcha_code": code,
        },
    )
