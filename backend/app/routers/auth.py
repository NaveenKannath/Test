import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas.schemas import (
    UserLoginRequest, UserRegisterRequest, UserResponse, AuthTokenResponse
)
from app.auth_utils import hash_password, verify_password, create_access_token, verify_access_token

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    
    # Query user from PostgreSQL
    res = await db.execute(select(User).where(User.email.ilike(email_clean)))
    user = res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been deactivated"
        )
        
    # Verify password
    is_valid = False
    if user.hashed_password:
        is_valid = verify_password(payload.password, user.hashed_password)
    else:
        # Fallback for unmigrated accounts if password matches default
        if payload.password in ["admin123", "auditor123", "operator123"]:
            user.hashed_password = hash_password(payload.password)
            db.add(user)
            await db.commit()
            await db.refresh(user)
            is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # Generate token
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role or "auditor",
        full_name=user.full_name or "Energy User"
    )
    
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role or "auditor",
            is_active=getattr(user, "is_active", True),
            created_at=user.created_at or datetime.utcnow()
        )
    )

@router.post("/register", response_model=AuthTokenResponse)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters long"
        )
        
    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email.ilike(email_clean)))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
        
    new_user = User(
        id=str(uuid.uuid4()),
        email=email_clean,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role if payload.role in ["admin", "auditor", "facility_manager", "viewer"] else "auditor",
        organization_id=payload.organization_id,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    token = create_access_token(
        user_id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        full_name=new_user.full_name
    )
    
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            role=new_user.role,
            is_active=new_user.is_active,
            created_at=new_user.created_at
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
        
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token"
        )
        
    user_id = payload.get("sub")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role or "auditor",
        is_active=getattr(user, "is_active", True),
        created_at=user.created_at or datetime.utcnow()
    )

@router.post("/logout")
async def logout():
    return {"status": "success", "message": "Successfully logged out"}
