import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.crud.user import get_user_by_upi_id
from app.crud.wallet import get_wallet_by_user_id
from app.models.base import User
from app.schemas.wallet import WalletResponse, WalletLookupResponse

router = APIRouter(prefix="/wallets", tags=["Wallets"])

db_dependency = Depends(get_db)
current_user_dependency = Depends(get_current_user)

@router.get("/user/{user_id}", response_model=WalletResponse)
async def get_wallet(user_id: uuid.UUID, db: AsyncSession = db_dependency, current_user: User = current_user_dependency):
    if user_id != current_user.id:
        raise HTTPException(403, "Not authorized to view this wallet")
    wallet = await get_wallet_by_user_id(db, user_id)
    if not wallet:
        raise HTTPException(404, detail="Wallet not found")
    return wallet

@router.get("/lookup/{upi_id}", response_model=WalletLookupResponse)
async def lookup_wallet_by_upi(upi_id: str, db: AsyncSession = db_dependency, current_user: User = current_user_dependency):
    target_user = await get_user_by_upi_id(db, upi_id)
    if not target_user or not target_user.wallet:
        raise HTTPException(404, detail="UPI ID not found")
        
    full_name = target_user.first_name
    if target_user.last_name:
        full_name += f" {target_user.last_name}"
        
    return WalletLookupResponse(
        wallet_id=target_user.wallet.id,
        masked_name=full_name
    )