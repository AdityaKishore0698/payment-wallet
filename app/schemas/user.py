import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str | None = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    upi_id: str
    first_name: str
    last_name: str | None = None
    wallet_id: uuid.UUID | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RecoverRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str