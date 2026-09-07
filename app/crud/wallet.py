import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Wallet


async def get_wallet_by_id(db: AsyncSession, wallet_id: uuid.UUID):
    stmt = select(Wallet).where(Wallet.id == wallet_id)
    return await db.scalar(stmt)

async def get_wallet_by_user_id(db: AsyncSession, user_id: uuid.UUID):
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    return await db.scalar(stmt)