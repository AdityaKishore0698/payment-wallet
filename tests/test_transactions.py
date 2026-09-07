import pytest
from httpx import AsyncClient

@pytest.fixture
async def setup_users(client: AsyncClient):
    user1 = await client.post("/users/", json={"first_name": "Alice", "last_name": "Smith", "email": "alice@example.com", "password": "pass"})
    user2 = await client.post("/users/", json={"first_name": "Bob", "last_name": "Jones", "email": "bob@example.com", "password": "pass"})
    
    token1 = (await client.post("/auth/login", data={"username": "alice@example.com", "password": "pass"})).json()["access_token"]
    token2 = (await client.post("/auth/login", data={"username": "bob@example.com", "password": "pass"})).json()["access_token"]
    
    auth1 = {"Authorization": f"Bearer {token1}"}
    auth2 = {"Authorization": f"Bearer {token2}"}
    
    wallet1_id = (await client.get(f"/wallets/user/{user1.json()['id']}", headers=auth1)).json()["id"]
    wallet2_id = (await client.get(f"/wallets/user/{user2.json()['id']}", headers=auth2)).json()["id"]
    
    return {
        "alice": {"auth": auth1, "wallet": wallet1_id, "upi": "alice.smith@wallet"},
        "bob": {"auth": auth2, "wallet": wallet2_id, "upi": "bob.jones@wallet"}
    }

@pytest.mark.asyncio
async def test_add_funds(client: AsyncClient, setup_users):
    users = setup_users
    # Add funds to Alice
    response = await client.post(f"/transactions/add_funds/{users['alice']['wallet']}", json={"amount": 5000}, headers=users['alice']['auth'])
    assert response.status_code == 200
    assert response.json()["amount"] == 5000
    
@pytest.mark.asyncio
async def test_transfer_funds(client: AsyncClient, setup_users):
    users = setup_users
    # Transfer from Alice to Bob
    payload = {
        "from_wallet_id": users['alice']['wallet'],
        "to_wallet_id": users['bob']['wallet'],
        "amount": 1000.0
    }
    response = await client.post("/transactions/transfer", json=payload, headers=users['alice']['auth'])
    assert response.status_code == 200
    
    # Check Bob's balance
    bob_wallet = await client.get(f"/wallets/{users['bob']['wallet']}", headers=users['bob']['auth'])
    # Starting bonus is 10000 + 1000 transfer
    assert bob_wallet.json()["balance"] == 11000.0
