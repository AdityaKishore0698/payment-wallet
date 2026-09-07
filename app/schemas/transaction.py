import enum
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TransactionType(enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class TransactionStatus(enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class TransactionCreate(BaseModel):
    amount: Decimal = Field(gt=0, description="Amount must be greater than zero")
    type: TransactionType

class TransactionResponse(BaseModel):
    id: uuid.UUID
    wallet_id: uuid.UUID
    amount: Decimal
    type: TransactionType
    reference_id: uuid.UUID | None = None
    counterparty_name: str | None = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TransferCreate(BaseModel):
    from_wallet_id: uuid.UUID
    to_wallet_id: uuid.UUID
    amount: Decimal = Field(gt=0, description="Amount must be greater than zero")

class AddFundsRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2, description="Amount must be greater than zero")
class PaginatedTransactionResponse(BaseModel):
    data: list[TransactionResponse]
    next_cursor: str | None = None
