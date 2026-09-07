import ssl

from celery import Celery

from app.core.config import REDIS_URL

# Upstash (and most managed Redis) require TLS and therefore the ``rediss://``
# scheme. Celery needs explicit SSL options for both the broker and the result
# backend when the URL is TLS.
celery_app = Celery("wallet_tasks", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.broker_connection_retry_on_startup = True

if REDIS_URL.startswith("rediss://"):
    # Upstash presents a valid public certificate; verify it unless the URL
    # explicitly opts out via ?ssl_cert_reqs=CERT_NONE / none.
    _cert_reqs = ssl.CERT_REQUIRED
    if "ssl_cert_reqs=CERT_NONE" in REDIS_URL or "ssl_cert_reqs=none" in REDIS_URL:
        _cert_reqs = ssl.CERT_NONE
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": _cert_reqs}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": _cert_reqs}


@celery_app.task(name="send_recovery_email_task")
def send_recovery_email_task(email: str, token: str):
    """
    Mock background task for sending emails.
    In a real app, this would use SMTP or an API like SendGrid.
    """
    import time
    # Simulate network delay
    time.sleep(2)
    print(f"========== EMAIL SENT ==========")
    print(f"To: {email}")
    print(f"Subject: Password Recovery")
    print(f"Body: Your password reset token is: {token}")
    print(f"================================")
    return True
