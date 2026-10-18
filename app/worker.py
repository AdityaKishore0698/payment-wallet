import logging
import smtplib
import ssl
from email.message import EmailMessage

from celery import Celery

from app.core.config import (
    REDIS_URL,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
)

logger = logging.getLogger(__name__)

# Upstash (and most managed Redis) require TLS and therefore the ``rediss://``
# scheme. Celery needs explicit SSL options for both the broker and the result
# backend when the URL is TLS.
celery_app = Celery("wallet_tasks", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.broker_connection_retry_on_startup = True
# A dedicated queue name, so another Celery app pointed at the same Redis can't
# consume this app's jobs (both would otherwise share the default "celery" queue).
celery_app.conf.task_default_queue = "wallet"

if REDIS_URL.startswith("rediss://"):
    # Upstash presents a valid public certificate; verify it unless the URL
    # explicitly opts out via ?ssl_cert_reqs=CERT_NONE / none.
    _cert_reqs = ssl.CERT_REQUIRED
    if "ssl_cert_reqs=CERT_NONE" in REDIS_URL or "ssl_cert_reqs=none" in REDIS_URL:
        _cert_reqs = ssl.CERT_NONE
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": _cert_reqs}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": _cert_reqs}


@celery_app.task(name="send_recovery_email_task")
def send_recovery_email_task(email: str, token: str) -> bool:
    """Email a password-recovery token over SMTP (Mailpit locally)."""
    if not SMTP_HOST:
        logger.warning("SMTP_HOST is not set; recovery email to %s was not sent", email)
        return False

    msg = EmailMessage()
    msg["Subject"] = "Reset your Digital Wallet password"
    msg["From"] = SMTP_FROM
    msg["To"] = email
    msg.set_content(
        "We received a request to reset your Digital Wallet password.\n\n"
        f"Your recovery token is: {token}\n\n"
        "Paste it on the reset page together with your new password. "
        "If you didn't ask for this, you can ignore this email."
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        if SMTP_USERNAME:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(msg)
    return True
