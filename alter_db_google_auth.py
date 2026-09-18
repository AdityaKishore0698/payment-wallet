"""
One-off manual migration for the Google Sign-In feature.

`Base.metadata.create_all` (run automatically on app startup) only creates
tables that don't exist yet — it never alters an existing table. Any
database that already has a `users` table (i.e. any already-deployed
environment, including production) needs this run against it once, by hand,
the same way `alter_db.py` was used for an earlier schema change.

Local Docker Compose doesn't need this: `docker compose down -v && up` drops
the volume and lets `create_all` build the new schema from scratch.

Usage: set DATABASE_URL to the target database and run
    python alter_db_google_auth.py
"""
import asyncio

from sqlalchemy import text

from app.core.database import engine


STATEMENTS = [
    "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR NOT NULL DEFAULT 'local';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR;",
    "ALTER TABLE users ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);",
]


async def alter():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            try:
                await conn.execute(text(stmt))
                print(f"OK   {stmt}")
            except Exception as e:
                # Re-running this script should be harmless — e.g. the UNIQUE
                # constraint has no IF NOT EXISTS form, so "already exists" on
                # a second run is expected, not a failure.
                print(f"SKIP {stmt}  ({e})")


if __name__ == "__main__":
    asyncio.run(alter())
