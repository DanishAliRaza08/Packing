"""Sends quote notifications by SMTP. If SMTP isn't configured, emails are logged instead."""

import smtplib
import ssl
from email.message import EmailMessage

from flask import current_app


def send_email(to, subject, body, reply_to=None):
    cfg = current_app.config
    if not cfg.get("SMTP_HOST"):
        current_app.logger.info("SMTP not configured; email to %s not sent: %s", to, subject)
        return False

    msg = EmailMessage()
    msg["From"] = cfg["MAIL_FROM"]
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)

    try:
        if cfg["SMTP_PORT"] == 465:
            server = smtplib.SMTP_SSL(cfg["SMTP_HOST"], 465, context=ssl.create_default_context(), timeout=15)
        else:
            server = smtplib.SMTP(cfg["SMTP_HOST"], cfg["SMTP_PORT"], timeout=15)
            server.starttls(context=ssl.create_default_context())
        with server:
            if cfg.get("SMTP_USER"):
                server.login(cfg["SMTP_USER"], cfg["SMTP_PASSWORD"])
            server.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError):
        current_app.logger.exception("Could not send email to %s", to)
        return False
