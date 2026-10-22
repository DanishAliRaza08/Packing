"""Form protection: CSRF tokens, honeypot, rate limiting and upload checks."""

import secrets
import time
from collections import defaultdict, deque
from pathlib import Path

from flask import abort, current_app, request, session

ALLOWED_UPLOADS = {
    ".pdf": [b"%PDF"],
    ".ai": [b"%PDF", b"%!PS"],
    ".eps": [b"%!PS", b"\xc5\xd0\xd3\xc6"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".svg": None,  # text format, checked separately
}

HONEYPOT_FIELD = "website"


def csrf_token():
    if "_csrf" not in session:
        session["_csrf"] = secrets.token_urlsafe(32)
    return session["_csrf"]


def check_csrf():
    sent = request.form.get("_csrf", "")
    if not sent or not secrets.compare_digest(sent, session.get("_csrf", "")):
        abort(400, "Your session expired. Please reload the page and try again.")


def is_bot():
    """True if the hidden honeypot field was filled in."""
    return bool(request.form.get(HONEYPOT_FIELD, "").strip())


class RateLimiter:
    """In-memory sliding window per client IP. Good for a single server process."""

    def __init__(self):
        self.hits = defaultdict(deque)

    def allow(self, key, limit, window_seconds):
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


limiter = RateLimiter()


def client_ip():
    if current_app.config.get("TRUST_PROXY"):
        return request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    return request.remote_addr or ""


def rate_limited(bucket):
    cfg = current_app.config
    return not limiter.allow(f"{bucket}:{client_ip()}", cfg["RATE_LIMIT_COUNT"], cfg["RATE_LIMIT_WINDOW"])


class UploadError(ValueError):
    pass


def save_upload(file_storage, upload_dir):
    """Validate and store an uploaded artwork file. Returns (original_name, stored_name) or (None, None)."""
    if not file_storage or not file_storage.filename:
        return None, None
    original = Path(file_storage.filename).name[:200]
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_UPLOADS:
        raise UploadError("Please upload a PDF, AI, EPS, SVG, PNG or JPG file.")

    head = file_storage.stream.read(512)
    file_storage.stream.seek(0)
    signatures = ALLOWED_UPLOADS[ext]
    if signatures is None:
        if b"<svg" not in head.lower() and b"<?xml" not in head.lower():
            raise UploadError("That SVG file doesn't look valid.")
    elif not any(head.startswith(sig) for sig in signatures):
        raise UploadError(f"That file doesn't look like a real {ext.upper().lstrip('.')} file.")

    stored = f"{secrets.token_hex(16)}{ext}"
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
    file_storage.save(Path(upload_dir) / stored)
    return original, stored
