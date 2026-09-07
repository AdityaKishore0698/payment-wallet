from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import DATABASE_URL


def _normalize_database_url(url: str) -> str:
    """Accept the plain connection string that managed providers hand out.

    Supabase / Render give a URL like ``postgresql://user:pass@host/db`` (or the
    legacy ``postgres://`` scheme). SQLAlchemy needs an explicit async driver, so
    upgrade the scheme to psycopg 3's async driver while leaving an
    already-qualified URL (``postgresql+psycopg_async://``) untouched.
    """
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg_async://" + url[len("postgresql://") :]
    return url


db_url = _normalize_database_url(DATABASE_URL)

# Supabase's transaction pooler (PgBouncer, port 6543) multiplexes many client
# sessions onto few server connections, so server-side prepared statements leak
# across sessions and break. Detect the pooler and:
#   * tell psycopg 3 to never use prepared statements (prepare_threshold=None)
#   * use NullPool — PgBouncer already pools, and its connections are short-lived
_is_transaction_pooler = ":6543" in db_url or "pooler.supabase.com" in db_url

engine_kwargs: dict = {}
connect_args: dict = {}

if _is_transaction_pooler:
    connect_args["prepare_threshold"] = None
    engine_kwargs["poolclass"] = NullPool
else:
    # Direct connections: recycle liveness checks for free-tier DBs that drop
    # idle connections (Supabase direct, Neon autosuspend).
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(db_url, connect_args=connect_args, **engine_kwargs)

SessionLocal = async_sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)


async def get_db():
    async with SessionLocal() as session:
        yield session
