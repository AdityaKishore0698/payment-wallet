import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "password": "password123"
    }
    response = await client.post("/users/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "upi_id" in data
    assert data["upi_id"] == "test.user@wallet"

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    payload = {
        "username": "test@example.com",
        "password": "password123"
    }
    response = await client.post("/auth/login", data=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    payload = {
        "username": "test@example.com",
        "password": "wrongpassword"
    }
    response = await client.post("/auth/login", data=payload)
    assert response.status_code == 401
