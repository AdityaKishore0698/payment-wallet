from typing import Annotated
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import GOOGLE_CLIENT_ID
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.crud.user import authentic_user, get_or_create_google_user, get_user_by_email
from app.schemas.user import GoogleAuthRequest, RecoverRequest, ResetPasswordRequest, ChangePasswordRequest
from app.worker import send_recovery_email_task
from app.models.base import User
from app.api.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])
db_dependency = Depends(get_db)

# In-memory store for reset tokens (in a real app, store in Redis or DB)
reset_tokens = {}

@router.post("/login")
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = db_dependency,
):
    user = await authentic_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(401, "Incorrect email or password")
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google")
async def login_with_google(req: GoogleAuthRequest, db: AsyncSession = db_dependency):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google sign-in is not configured on this server")

    try:
        claims = google_id_token.verify_oauth2_token(
            req.id_token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        # Covers a bad signature, wrong audience, expired token, etc.
        raise HTTPException(401, "Invalid Google credential")

    if not claims.get("email_verified", False):
        raise HTTPException(401, "Google account email is not verified")

    user = await get_or_create_google_user(
        db,
        google_sub=claims["sub"],
        email=claims["email"],
        first_name=claims.get("given_name") or claims.get("name") or "User",
        last_name=claims.get("family_name"),
    )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/recover")
async def recover_password(req: RecoverRequest, db: AsyncSession = db_dependency):
    user = await get_user_by_email(db, req.email)
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If that email is registered, a recovery token has been sent."}
    
    token = str(uuid.uuid4())
    reset_tokens[token] = user.id
    
    # Send email in background using Celery
    try:
        send_recovery_email_task.delay(req.email, token)
    except Exception as e:
        logger.warning(f"Could not send email to Celery queue (Redis might be down): {e}")
    
    # For demo purposes, we also return the token in the response so the user can easily copy it from the UI
    return {"message": "If that email is registered, a recovery token has been sent.", "demo_token": token}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = db_dependency):
    if req.token not in reset_tokens:
        raise HTTPException(400, "Invalid or expired token")
        
    user_id = reset_tokens[req.token]
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
        
    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    
    # Invalidate token
    del reset_tokens[req.token]
    
    return {"message": "Password updated successfully"}

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest, 
    db: AsyncSession = db_dependency, 
    current_user: User = Depends(get_current_user)
):
    if not current_user.hashed_password:
        raise HTTPException(400, "This account signs in with Google and has no password to change")
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(400, "Incorrect old password")
        
    current_user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    
    return {"message": "Password changed successfully"}