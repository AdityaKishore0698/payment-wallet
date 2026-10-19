import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient


async def make_user(client: AsyncClient, first_name: str) -> dict:
    email = f"{first_name.lower()}_{uuid.uuid4().hex[:12]}@example.com"
    user = (
        await client.post(
            "/users/", json={"first_name": first_name, "email": email, "password": "pass"}
        )
    ).json()
    token = (
        await client.post("/auth/login", data={"username": email, "password": "pass"})
    ).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    wallet = (await client.get(f"/wallets/user/{user['id']}", headers=auth)).json()
    return {"id": user["id"], "auth": auth, "wallet": wallet["id"]}


async def balance(client: AsyncClient, user: dict) -> Decimal:
    wallet = (await client.get(f"/wallets/user/{user['id']}", headers=user["auth"])).json()
    return Decimal(wallet["balance"])


@pytest.mark.asyncio
async def test_add_funds(client: AsyncClient):
    alice = await make_user(client, "Alice")
    response = await client.post(
        f"/transactions/add_funds/{alice['wallet']}", json={"amount": 5000}, headers=alice["auth"]
    )
    assert response.status_code == 200
    # Decimals are serialised as strings.
    assert Decimal(response.json()["amount"]) == Decimal("5000")
    assert await balance(client, alice) == Decimal("15000.00")


@pytest.mark.asyncio
async def test_add_funds_over_limit(client: AsyncClient):
    alice = await make_user(client, "Alice")
    response = await client.post(
        f"/transactions/add_funds/{alice['wallet']}", json={"amount": 50000.01}, headers=alice["auth"]
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_transfer_funds(client: AsyncClient):
    alice = await make_user(client, "Alice")
    bob = await make_user(client, "Bob")
    response = await client.post(
        "/transactions/transfer",
        json={"from_wallet_id": alice["wallet"], "to_wallet_id": bob["wallet"], "amount": "1000"},
        headers=alice["auth"],
    )
    assert response.status_code == 200
    debit, credit = response.json()
    assert debit["type"] == "DEBIT" and credit["type"] == "CREDIT"
    assert debit["reference_id"] == credit["reference_id"]
    assert await balance(client, alice) == Decimal("9000.00")
    assert await balance(client, bob) == Decimal("11000.00")


@pytest.mark.asyncio
async def test_transfer_insufficient_funds(client: AsyncClient):
    alice = await make_user(client, "Alice")
    bob = await make_user(client, "Bob")
    response = await client.post(
        "/transactions/transfer",
        json={"from_wallet_id": alice["wallet"], "to_wallet_id": bob["wallet"], "amount": "10000.01"},
        headers=alice["auth"],
    )
    assert response.status_code == 400
    assert await balance(client, alice) == Decimal("10000.00")


@pytest.mark.asyncio
async def test_transfer_from_someone_elses_wallet_is_forbidden(client: AsyncClient):
    alice = await make_user(client, "Alice")
    bob = await make_user(client, "Bob")
    response = await client.post(
        "/transactions/transfer",
        json={"from_wallet_id": bob["wallet"], "to_wallet_id": alice["wallet"], "amount": "10"},
        headers=alice["auth"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_transfer_rejects_sub_paisa_amounts(client: AsyncClient):
    alice = await make_user(client, "Alice")
    bob = await make_user(client, "Bob")
    response = await client.post(
        "/transactions/transfer",
        json={"from_wallet_id": alice["wallet"], "to_wallet_id": bob["wallet"], "amount": "0.005"},
        headers=alice["auth"],
    )
    assert response.status_code == 422
