import asyncio
from app.core.database import engine
from sqlalchemy import text

async def alter():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE wallets ADD COLUMN name VARCHAR DEFAULT 'Main Wallet';"))
            print("Successfully added name to wallets")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter())
