import enum
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class Currency(enum.Enum):
    USD = "USD"
    INR = "INR"
    EUR = "EUR"

class WalletCreate(BaseModel):
    currency: Currency

class WalletResponse(BaseModel):
    id: uuid.UUID
    name: str
    user_id: uuid.UUID
    balance: Decimal
    currency: Currency
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WalletLookupResponse(BaseModel):
    wallet_id: uuid.UUID
    masked_name: str
