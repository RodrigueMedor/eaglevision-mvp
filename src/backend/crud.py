from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = pwd_context.hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False

def get_refresh_token(db: Session, token_id: str):
    return db.query(models.RefreshToken).filter(models.RefreshToken.id == token_id).first()

def create_refresh_token(db: Session, token_data: dict):
    db_token = models.RefreshToken(**token_data)
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def revoke_refresh_token(db: Session, token_id: str):
    db_token = get_refresh_token(db, token_id)
    if db_token:
        db_token.revoked = True
        db_token.revoked_at = datetime.utcnow()
        db.commit()
        return True
    return False

def revoke_all_user_tokens(db: Session, user_id: str):
    tokens = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.revoked == False
    ).all()
    
    for token in tokens:
        token.revoked = True
        token.revoked_at = datetime.utcnow()
    
    db.commit()
    return len(tokens)

def get_user_by_reset_token(db: Session, token: str):
    return db.query(models.User).join(
        models.PasswordResetToken,
        models.PasswordResetToken.user_id == models.User.id
    ).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.expires_at > datetime.utcnow(),
        models.PasswordResetToken.used == False
    ).first()

def create_password_reset_token(db: Session, user_id: str, token: str, expires_in_hours: int = 24):
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
    db_token = models.PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def mark_token_as_used(db: Session, token: str):
    db_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token
    ).first()
    
    if db_token:
        db_token.used = True
        db_token.used_at = datetime.utcnow()
        db.commit()
        return True
    return False
