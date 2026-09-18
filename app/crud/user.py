import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.security import get_password_hash, verify_password
from app.models.base import User, Wallet
from app.schemas.user import UserCreate


async def create_user(db: AsyncSession, user: UserCreate):
    user_data = user.model_dump()
    plain_password = user_data.pop("password")
    user_data["hashed_password"] = get_password_hash(plain_password)
    user_data["upi_id"] = f"{user_data['first_name'].lower().replace(' ', '')}{random.randint(100, 999)}@wallet"
    db_user = User(**user_data)
    db.add(db_user)
    await db.flush()
    new_wallet = Wallet(user_id=db_user.id, name="Main Wallet", balance=10000, currency="INR")
    db.add(new_wallet)
    await db.commit()
    await db.refresh(db_user)
    db_user.wallet_id = new_wallet.id
    return db_user

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID):
    stmt = select(User).where(User.id == user_id)
    return await db.scalar(stmt)

async def authentic_user(db: AsyncSession, email: str, password: str):
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        return None
    if not user.hashed_password:
        # Google-only account — there's no password to check against.
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def get_user_by_upi_id(db: AsyncSession, upi_id: str):
    stmt = select(User).options(joinedload(User.wallet)).where(User.upi_id == upi_id)
    return await db.scalar(stmt)

async def get_user_by_email(db: AsyncSession, email: str):
    stmt = select(User).where(User.email == email)
    return await db.scalar(stmt)

async def get_user_by_google_sub(db: AsyncSession, google_sub: str):
    stmt = select(User).where(User.google_sub == google_sub)
    return await db.scalar(stmt)

async def get_or_create_google_user(
    db: AsyncSession,
    *,
    google_sub: str,
    email: str,
    first_name: str,
    last_name: str | None,
):
    """Log in an existing Google-linked user, link Google to a matching
    existing email/password account, or register a brand-new one — whichever
    applies. Always returns a persisted User with a wallet."""
    existing = await get_user_by_google_sub(db, google_sub)
    if existing:
        return existing

    by_email = await get_user_by_email(db, email)
    if by_email:
        # Same email already has an account (e.g. registered with a password)
        # — link this Google identity to it rather than erroring or creating
        # a duplicate account for the same person.
        by_email.google_sub = google_sub
        await db.commit()
        await db.refresh(by_email)
        return by_email

    upi_id = f"{first_name.lower().replace(' ', '')}{random.randint(100, 999)}@wallet"
    db_user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        upi_id=upi_id,
        hashed_password=None,
        auth_provider="google",
        google_sub=google_sub,
    )
    db.add(db_user)
    await db.flush()
    new_wallet = Wallet(user_id=db_user.id, name="Main Wallet", balance=10000, currency="INR")
    db.add(new_wallet)
    await db.commit()
    await db.refresh(db_user)
    db_user.wallet_id = new_wallet.id
    return db_user

async def delete_user_data(db: AsyncSession, user: User):
    from sqlalchemy import delete
    from app.models.base import Transaction
    
    # User might have multiple wallets, but right now there's just one relationship 'wallet'
    # Wait, the relationship is `wallet : Mapped["Wallet"]`, but actually the database can have multiple wallets.
    # It's better to delete wallets and transactions by user_id
    
    # Delete transactions for all wallets owned by this user
    wallets_stmt = select(Wallet.id).where(Wallet.user_id == user.id)
    wallet_ids = (await db.scalars(wallets_stmt)).all()
    
    if wallet_ids:
        await db.execute(delete(Transaction).where(Transaction.wallet_id.in_(wallet_ids)))
        await db.execute(delete(Wallet).where(Wallet.id.in_(wallet_ids)))
        
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()