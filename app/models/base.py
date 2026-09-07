import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    UUID,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass

class transaction_status(enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    email : Mapped[str] = mapped_column(String, unique=True, nullable=False)
    upi_id : Mapped[str] = mapped_column(String, unique=True, nullable=False)
    first_name : Mapped[str] = mapped_column(String, nullable=False)
    last_name : Mapped[str] = mapped_column(String, nullable = True)
    created_at : Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    wallet : Mapped["Wallet"] = relationship(back_populates="user")
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    
class Wallet(Base):
    __tablename__ = 'wallets'

    id : Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    name : Mapped[str] = mapped_column(String, default='Main Wallet')
    user_id : Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("users.id"))
    balance : Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), CheckConstraint("balance>=0"))
    currency : Mapped[str] = mapped_column(String(3), default='INR')
    created_at : Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    user : Mapped["User"] = relationship(back_populates="wallet")
    transactions : Mapped[list["Transaction"]] = relationship(back_populates="wallet")

class Transaction(Base):
    __tablename__ = 'transactions'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    wallet_id : Mapped[uuid.UUID] = mapped_column(ForeignKey("wallets.id"))
    amount : Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), CheckConstraint("amount>0"))
    type : Mapped[str] = mapped_column(String, nullable=False)
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=True, index=True)
    status : Mapped[transaction_status] = mapped_column(Enum(transaction_status), default="PENDING")
    created_at : Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    wallet : Mapped["Wallet"] = relationship(back_populates="transactions")