Table: users
- id (UUID, Primary Key)
- email (String, Unique, Indexed)
- first_name (String)
- last_name (String)
- created_at (Timestamp)

Table: wallets
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key -> users.id, Unique) # 1:1 relationship for now
- balance (Numeric, Check >= 0)
- currency (String, default 'INR')
- created_at (Timestamp)

Table: transactions (Your Ledger Entries)
- id (UUID, Primary Key)
- from_wallet_id (UUID, Foreign Key -> wallets.id, Nullable for system deposits)
- to_wallet_id (UUID, Foreign Key -> wallets.id, Nullable for system withdrawals)
- amount (Numeric, Check > 0)
- status (String: PENDING, SUCCESS, FAILED)
- created_at (Timestamp)