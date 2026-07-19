from __future__ import annotations

from base64 import b64encode
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from secrets import choice, token_hex
from threading import Lock
from time import monotonic

from PIL import Image, ImageDraw, ImageFont


CAPTCHA_TTL_SECONDS = 300
CAPTCHA_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
MAX_ACTIVE_CAPTCHAS = 2000


@dataclass(frozen=True)
class CaptchaChallenge:
    captcha_id: str
    code: str
    image: str
    expires_in: int = CAPTCHA_TTL_SECONDS


class CaptchaStore:
    """Thread-safe, one-time graphical captcha store."""

    def __init__(self) -> None:
        self._items: dict[str, tuple[str, float]] = {}
        self._lock = Lock()

    @staticmethod
    def _digest(captcha_id: str, code: str) -> str:
        return sha256(f"{captcha_id}:{code.upper()}".encode("utf-8")).hexdigest()

    def issue(self) -> CaptchaChallenge:
        captcha_id = token_hex(16)
        code = "".join(choice(CAPTCHA_ALPHABET) for _ in range(4))
        now = monotonic()
        with self._lock:
            self._purge_expired(now)
            if len(self._items) >= MAX_ACTIVE_CAPTCHAS:
                oldest_id = min(self._items, key=lambda key: self._items[key][1])
                self._items.pop(oldest_id, None)
            self._items[captcha_id] = (
                self._digest(captcha_id, code),
                now + CAPTCHA_TTL_SECONDS,
            )
        return CaptchaChallenge(captcha_id, code, _render_png_data_url(code))

    def verify_and_consume(self, captcha_id: str, code: str) -> bool:
        now = monotonic()
        with self._lock:
            self._purge_expired(now)
            stored = self._items.pop(captcha_id, None)
        if not stored:
            return False
        expected_digest, expires_at = stored
        return expires_at >= now and self._digest(captcha_id, code.strip()) == expected_digest

    def _purge_expired(self, now: float) -> None:
        expired = [key for key, (_, expires_at) in self._items.items() if expires_at < now]
        for key in expired:
            self._items.pop(key, None)


def _render_png_data_url(code: str) -> str:
    width, height = 150, 48
    image = Image.new("RGB", (width, height), "#eef8fb")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=30)

    for index in range(6):
        x1 = (index * 29 + ord(code[index % len(code)])) % width
        y1 = (index * 13 + ord(code[(index + 1) % len(code)])) % height
        x2 = (x1 + 45 + index * 7) % width
        y2 = (y1 + 19 + index * 5) % height
        draw.line((x1, y1, x2, y2), fill="#5da9bd", width=1)

    for index, char in enumerate(code):
        x = 12 + index * 34
        y = 5 + (ord(char) % 7)
        draw.text((x, y), char, font=font, fill="#123a55", stroke_width=1, stroke_fill="#d8f0f5")

    for index in range(34):
        x = (index * 43 + ord(code[index % len(code)])) % width
        y = (index * 17 + ord(code[(index + 2) % len(code)])) % height
        draw.point((x, y), fill="#7bafbb")

    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return "data:image/png;base64," + b64encode(output.getvalue()).decode("ascii")


captcha_store = CaptchaStore()
