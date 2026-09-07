import asyncio
from app.core.database import engine
from app.models.base import Base

async def reset():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset successfully.")

if __name__ == "__main__":
    asyncio.run(reset())
