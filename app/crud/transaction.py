import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Transaction, Wallet, User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionStatus,
    TransactionType,
    TransferCreate,
)


async def create_transaction(db: AsyncSession, wallet_id: uuid.UUID, transaction_in: TransactionCreate):
    wallet = await db.scalar(select(Wallet).with_for_update().where(Wallet.id == wallet_id))
    if not wallet:
        raise ValueError("Wallet not found")
    if transaction_in.type == TransactionType.CREDIT:
        wallet.balance += transaction_in.amount
    if transaction_in.type == TransactionType.DEBIT:
        if wallet.balance < transaction_in.amount:
            raise ValueError("Insufficient funds")
        wallet.balance -= transaction_in.amount
    transaction = Transaction(wallet_id=wallet.id, amount=transaction_in.amount, type=transaction_in.type.value, status="SUCCESS")
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction) 
    return transaction

import base64
from datetime import datetime
from sqlalchemy import or_, and_

async def get_transactions_by_wallet(db: AsyncSession, wallet_id: uuid.UUID, cursor: str | None = None, limit: int = 100):
    stmt = select(Transaction).where(Transaction.wallet_id == wallet_id)
    
    if cursor:
        try:
            decoded = base64.b64decode(cursor).decode('utf-8')
            created_at_str, tx_id_str = decoded.split('|')
            cursor_created_at = datetime.fromisoformat(created_at_str)
            cursor_tx_id = uuid.UUID(tx_id_str)
            
            stmt = stmt.where(
                or_(
                    Transaction.created_at < cursor_created_at,
                    and_(Transaction.created_at == cursor_created_at, Transaction.id < cursor_tx_id)
                )
            )
        except Exception:
            pass
            
    stmt = stmt.order_by(Transaction.created_at.desc(), Transaction.id.desc()).limit(limit)
    result = await db.scalars(stmt)
    transactions = result.all()
    
    enriched_txs = []
    for tx in transactions:
        counterparty_name = "System" # Fallback if no reference_id (like adding funds)
        if tx.reference_id:
            stmt_other = select(User.first_name, User.last_name).join(Wallet, User.id == Wallet.user_id).join(Transaction, Wallet.id == Transaction.wallet_id).where(
                Transaction.reference_id == tx.reference_id,
                Transaction.wallet_id != wallet_id
            )
            res = await db.execute(stmt_other)
            row = res.first()
            if row:
                first, last = row
                counterparty_name = f"{first} {last}" if last else first
            else:
                counterparty_name = "Deleted User"
        
        setattr(tx, 'counterparty_name', counterparty_name)
        enriched_txs.append(tx)
        
    next_cursor = None
    if len(enriched_txs) == limit:
        last_tx = enriched_txs[-1]
        # Make sure tz-naive datetimes can be ISO formatted, or strip timezone if not present.
        # Actually isoformat() handles it natively.
        raw_cursor = f"{last_tx.created_at.isoformat()}|{last_tx.id}"
        next_cursor = base64.b64encode(raw_cursor.encode('utf-8')).decode('utf-8')
        
    return {"data": enriched_txs, "next_cursor": next_cursor}

async def transfer_funds(db: AsyncSession, transfer_in: TransferCreate):
    if transfer_in.from_wallet_id == transfer_in.to_wallet_id:
        raise ValueError("Cannot transfer to the same wallet")

    wallet_ids = sorted([transfer_in.from_wallet_id, transfer_in.to_wallet_id])
    
    stmt = select(Wallet).where(Wallet.id.in_(wallet_ids)).order_by(Wallet.id).with_for_update()
    result = await db.scalars(stmt)
    wallets = result.all()
    
    if len(wallets) != 2:
        raise ValueError("One or both wallets not found")
        
    wallet_map = {w.id: w for w in wallets}
    from_wallet = wallet_map[transfer_in.from_wallet_id]
    to_wallet = wallet_map[transfer_in.to_wallet_id]
    
    if from_wallet.balance < transfer_in.amount:
        raise ValueError("Insufficient funds")
        
    from_wallet.balance -= transfer_in.amount
    to_wallet.balance += transfer_in.amount
    
    ref_id = uuid.uuid4()
    
    debit_tx = Transaction(
        wallet_id=from_wallet.id,
        amount=transfer_in.amount,
        type=TransactionType.DEBIT.value,
        reference_id=ref_id,
        status="SUCCESS"
    )
    
    credit_tx = Transaction(
        wallet_id=to_wallet.id,
        amount=transfer_in.amount,
        type=TransactionType.CREDIT.value,
        reference_id=ref_id,
        status="SUCCESS"
    )
    
    db.add(debit_tx)
    db.add(credit_tx)
    await db.commit()
    await db.refresh(debit_tx)
    await db.refresh(credit_tx)
    return debit_tx, credit_tx

async def get_wallet_analytics(
    db: AsyncSession, wallet_id: uuid.UUID, current_balance: Decimal, months: int = 6
):
    """Monthly credit/debit totals and closing balance for the dashboard
    charts. Balance is reconstructed from the *entire* transaction history
    (so it's correct even when the account is older than the display
    window), then windowed down to the last `months` calendar months,
    forward-filling balance across months with no activity.

    New wallets are seeded with a starting balance (e.g. the signup bonus)
    that is set directly on the wallet row, not recorded as a transaction —
    so summing transactions from zero would undercount every balance by
    that amount. Instead, the cumulative transaction net is anchored to the
    wallet's current (known-correct) balance and offset backwards from
    there, which is correct regardless of whether such an untracked
    starting balance exists."""
    month_expr = func.date_trunc("month", Transaction.created_at)
    stmt = (
        select(
            month_expr.label("month"),
            func.coalesce(
                func.sum(case((Transaction.type == TransactionType.CREDIT.value, Transaction.amount))), 0
            ).label("credit_total"),
            func.coalesce(
                func.sum(case((Transaction.type == TransactionType.DEBIT.value, Transaction.amount))), 0
            ).label("debit_total"),
        )
        .where(Transaction.wallet_id == wallet_id)
        .group_by(month_expr)
        .order_by(month_expr)
    )
    rows = (await db.execute(stmt)).all()

    running = Decimal("0")
    history: dict[str, dict] = {}
    for row in rows:
        key = f"{row.month.year:04d}-{row.month.month:02d}"
        credit = Decimal(str(row.credit_total))
        debit = Decimal(str(row.debit_total))
        running += credit - debit
        history[key] = {"credit_total": credit, "debit_total": debit, "_cum_net": running}

    # `running` is now the total net of every transaction ever. Whatever's
    # left over between that and the real current balance is the untracked
    # starting balance — add it back to every month's cumulative net.
    offset = current_balance - running
    for point in history.values():
        point["closing_balance"] = point.pop("_cum_net") + offset

    today = datetime.now(timezone.utc)
    keys = []
    y, m = today.year, today.month
    for _ in range(months):
        keys.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    keys.reverse()

    carry_from = [k for k in sorted(history) if k < keys[0]]
    last_balance = history[carry_from[-1]]["closing_balance"] if carry_from else offset

    points = []
    for key in keys:
        point = history.get(key)
        if point:
            last_balance = point["closing_balance"]
            points.append({"month": key, **point})
        else:
            points.append({
                "month": key,
                "credit_total": Decimal("0"),
                "debit_total": Decimal("0"),
                "closing_balance": last_balance,
            })
    return points

async def get_contacts_by_wallet(db: AsyncSession, wallet_id: uuid.UUID):
    stmt1 = select(Transaction.reference_id).where(
        Transaction.wallet_id == wallet_id, 
        Transaction.reference_id.isnot(None)
    ).distinct()
    result = await db.scalars(stmt1)
    ref_ids = result.all()
    
    if not ref_ids:
        return []
        
    stmt2 = select(User.upi_id).join(Wallet, User.id == Wallet.user_id).join(Transaction, Wallet.id == Transaction.wallet_id).where(
        Transaction.reference_id.in_(ref_ids),
        Transaction.wallet_id != wallet_id
    ).distinct()
    
    result2 = await db.scalars(stmt2)
    return result2.all()
