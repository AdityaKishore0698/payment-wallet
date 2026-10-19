import uuid

import pytest
from httpx import AsyncClient


async def register(client: AsyncClient, password: str = "password123") -> dict:
    email = f"test_{uuid.uuid4().hex[:12]}@example.com"
    response = await client.post(
        "/users/",
        json={"first_name": "Test", "last_name": "User", "email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return {**response.json(), "password": password}


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    user = await register(client)
    assert user["email"].endswith("@example.com")
    # UPI IDs are the lowercased first name + a 3-digit number.
    assert user["upi_id"].startswith("test")
    assert user["upi_id"].endswith("@wallet")
    # The response model has no password fields at all.
    response_fields = set(user) - {"password"}
    assert not {"password", "hashed_password"} & response_fields


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    user = await register(client)
    response = await client.post(
        "/users/",
        json={"first_name": "Again", "email": user["email"], "password": "password123"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    user = await register(client)
    response = await client.post(
        "/auth/login", data={"username": user["email"], "password": user["password"]}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    user = await register(client)
    response = await client.post(
        "/auth/login", data={"username": user["email"], "password": "wrongpassword"}
    )
    assert response.status_code == 401
