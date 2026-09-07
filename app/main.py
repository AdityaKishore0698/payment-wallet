from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, transaction, user, wallet
from app.core.config import FRONTEND_ORIGIN_REGEX, FRONTEND_ORIGINS
from app.core.database import engine
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Digital Wallet API", version="1.0.0", lifespan=lifespan)

# The hosted frontend (Vercel) and API (Render) are on different origins, so the
# browser needs CORS to allow the deployed frontend. Origins come from the
# FRONTEND_ORIGINS env var (comma-separated); FRONTEND_ORIGIN_REGEX optionally
# covers Vercel preview deploys.
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=FRONTEND_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(wallet.router)
app.include_router(transaction.router)
