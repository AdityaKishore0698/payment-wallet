# Learning Document - Digital Wallet Project

This document tracks technical learnings and key design decisions made during the development of this project.

### 1. Database Deadlocks in Financial Systems
- **Problem:** When two users transfer money to each other at the exact same time, `SELECT ... FOR UPDATE` can cause the database to deadlock if transactions acquire row locks in a different order (e.g., Tx1 locks Wallet A then B, while Tx2 locks Wallet B then A).
- **Solution:** Always sort the resources before locking them. By sorting Wallet IDs (`sorted([from_id, to_id])`) before issuing `SELECT ... FOR UPDATE`, we guarantee all concurrent transactions acquire row locks in the exact same order, mathematically eliminating the possibility of a deadlock.

### 2. Standard Pagination vs. Keyset (Cursor) Pagination
- **Standard (`OFFSET`/`LIMIT`):** Slows down drastically as the table grows because the database must scan and discard all skipped rows before returning the requested page.
- **Cursor Pagination:** Uses a stable sorting key (like `created_at` and `uuid`) to fetch rows greater/less than the last seen item. This utilizes database indexes directly, ensuring O(1) query time regardless of how large the dataset grows.

### 3. Asynchronous Database Drivers
- Transitioning from `psycopg2` (sync) to `asyncpg` (async) with SQLAlchemy 2.0's `AsyncSession` drastically improves a Python web server's ability to handle high loads. Instead of blocking a thread while waiting for the database to return data, the event loop yields control and serves other requests.

### 4. Service-Oriented Architecture
- Breaking a monolith into pure Microservices (separate databases) for a wallet app introduces immense complexity (Distributed Sagas, Two-Phase Commits).
- **Better Approach:** Keep a monolithic Postgres DB for strict ACID compliance, but use Redis and Celery to offload background tasks (like emails or push notifications), effectively creating a scalable Service-Oriented Architecture.

### 5. `create_all` Does Not Migrate
`Base.metadata.create_all` only creates tables that are missing; it never alters an existing one. Adding columns to a model therefore needs an explicit migration for every database that already has the table, and it must run *before* the new code deploys — the ORM selects the new columns on every query, so the order matters more than the migration itself. Writing the statements to be idempotent (`ADD COLUMN IF NOT EXISTS`, a tolerated "already exists" on the constraint) makes re-running safe. A real migration tool (Alembic) is the longer-term answer.

### 6. Reconstructing a Balance History
A wallet's starting balance (the signup bonus) was stored on the wallet row rather than as a transaction, so summing transactions from zero under-counted every month. Anchoring the cumulative transaction total to the wallet's known-correct current balance and offsetting backwards is correct whether or not such untracked money exists.

### 7. Verifying Identity Tokens Server-Side
With Google Identity Services the browser gets a signed ID token and the backend verifies it (signature, audience = our client ID, `email_verified`). No client secret exists in this flow, so there is nothing to leak — but the *audience check* is what stops a token minted for a different app from logging someone in here.

### 8. Third-Party Iframes Limit Styling
The Google button is a cross-origin iframe: page CSS can't reach inside it, and Google deliberately offers no custom colours. Only the supported `renderButton` options (theme, size, shape, text, width) and the wrapper's own size/clipping are controllable. Clipping the wrapper can also damage the widget (it cropped the light theme's border), so verify against the real rendered widget rather than assuming.

### 9. Sticky Positioning and Layout
A sidebar in a CSS grid cell stretches to the row height, so it scrolls with the page. `position: sticky; top: 0; height: 100vh; align-self: start` keeps it one viewport tall. The same `sticky` fixes a mobile header, and giving that header a fixed height lets an animated drawer start exactly below it so the toggle stays clickable.

