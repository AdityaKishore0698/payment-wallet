import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.crud.transaction import create_transaction, get_transactions_by_wallet, transfer_funds, get_contacts_by_wallet
from app.crud.wallet import get_wallet_by_id
from app.models.base import User
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransferCreate, AddFundsRequest, TransactionType, PaginatedTransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])

db_dependency = Depends(get_db)
current_user_dependency = Depends(get_current_user)

@router.post("/transfer", response_model=list[TransactionResponse])
async def transfer_money(transfer_in: TransferCreate, db: AsyncSession = db_dependency, current_user: User = current_user_dependency):
    try:
        from_wallet = await get_wallet_by_id(db, transfer_in.from_wallet_id)
        if not from_wallet:
            raise HTTPException(404, detail="Sender wallet not found")
        if from_wallet.user_id != current_user.id:
            raise HTTPException(403, detail="Not authorized to use this wallet")
            
        debit_tx, credit_tx = await transfer_funds(db, transfer_in)
        return [debit_tx, credit_tx]
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

@router.post("/add_funds/{wallet_id}", response_model=TransactionResponse)
async def add_funds(wallet_id: uuid.UUID, funds_in: AddFundsRequest, db: AsyncSession = db_dependency, current_user: User = current_user_dependency):
    if funds_in.amount > 50000:
        raise HTTPException(400, detail="Cannot add more than ₹50,000 at a time")
    try:
        wallet = await get_wallet_by_id(db, wallet_id)
        if not wallet:
            raise HTTPException(404)
        if wallet.user_id!=current_user.id:
            raise HTTPException(403, "Not authorized to use this wallet")
            
        transaction_in = TransactionCreate(amount=funds_in.amount, type=TransactionType.CREDIT)
        return await create_transaction(db, wallet_id, transaction_in)
    except ValueError as e:
        if str(e) == "Wallet not found":
            raise HTTPException(404, detail=str(e))
        raise HTTPException(400, detail=str(e))

@router.get("/{wallet_id}/history", response_model=PaginatedTransactionResponse)
async def transaction_history(wallet_id: uuid.UUID, cursor: str | None = None, limit: int = 100, db: AsyncSession = db_dependency, current_user: User = current_user_dependency):
    wallet = await get_wallet_by_id(db, wallet_id)
    if not wallet:
        raise HTTPException(404)
    if wallet.user_id!=current_user.id:
        raise HTTPException(403, detail="Not authorized to use this wallet")
    return await get_transactions_by_wallet(db, wallet_id, cursor, limit)

@router.get("/{wallet_id}/contacts", response_model=list[str])
async def transaction_contacts(wallet_id: uuid.UUID, db: AsyncSession = db_dependency, current_user: User = current_user_dependency):
    wallet = await get_wallet_by_id(db, wallet_id)
    if not wallet:
        raise HTTPException(404)
    if wallet.user_id!=current_user.id:
        raise HTTPException(403, detail="Not authorized to use this wallet")
    return await get_contacts_by_wallet(db, wallet_id)