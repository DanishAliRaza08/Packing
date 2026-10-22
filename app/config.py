import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
    DATABASE = os.environ.get("DATABASE_PATH", str(INSTANCE_DIR / "quotes.db"))
    UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(INSTANCE_DIR / "uploads"))
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB artwork limit

    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
    NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "")

    SMTP_HOST = os.environ.get("SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    MAIL_FROM = os.environ.get("MAIL_FROM", "")

    RATE_LIMIT_COUNT = int(os.environ.get("RATE_LIMIT_COUNT", "5"))
    RATE_LIMIT_WINDOW = int(os.environ.get("RATE_LIMIT_WINDOW", "600"))
    TRUST_PROXY = os.environ.get("TRUST_PROXY", "0") == "1"

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "1") == "1"
