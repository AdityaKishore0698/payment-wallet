"""Central runtime configuration, read from environment variables.

Every hosted environment (Render) injects these. The fallbacks target the local
Docker Compose stack so nothing needs to be set for local development.
"""

import os


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


# --- Database (Supabase / local Postgres) ---
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg_async://postgres:postgres@localhost:5432/wallet_db",
)

# --- Redis broker for Celery (Upstash / local Redis) ---
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# --- CORS: comma-separated list of allowed browser origins ---
# Include local dev ports and every Vercel domain the frontend is served from.
FRONTEND_ORIGINS: list[str] = _split_csv(
    os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
)
# Optional regex fallback (e.g. Vercel preview deploys: https://.*\.vercel\.app)
FRONTEND_ORIGIN_REGEX: str | None = os.getenv("FRONTEND_ORIGIN_REGEX") or None

# --- Auth ---
SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-insecure-secret-change-me")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# --- Google OAuth (Sign in with Google) ---
# The OAuth client ID from Google Cloud Console → APIs & Services → Credentials.
# Must match the value the frontend uses (NEXT_PUBLIC_GOOGLE_CLIENT_ID) — the
# backend checks incoming ID tokens were issued *for* this client ID. Empty by
# default: the /auth/google endpoint refuses requests until this is set.
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
