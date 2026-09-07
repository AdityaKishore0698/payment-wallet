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
