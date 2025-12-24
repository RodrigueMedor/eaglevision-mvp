from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from enum import Enum
from datetime import datetime

# Base schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None  # Kept for backward compatibility
    first_name: str
    last_name: str
    phone: Optional[str] = None  # Kept for backward compatibility
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: Optional[str] = "client"

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None  # Kept for backward compatibility
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None  # Kept for backward compatibility
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: Optional[str] = None  # Kept for backward compatibility
    phone: Optional[str] = None  # Kept for backward compatibility
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            email=obj.email,
            full_name=obj.full_name,
            phone=obj.phone,
            role=obj.role.value if hasattr(obj.role, 'value') else str(obj.role),
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            is_active=getattr(obj, 'is_active', True)
        )

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Appointment schemas
class AppointmentBase(BaseModel):
    service: str
    appointment_date: datetime
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    service: Optional[str] = None
    appointment_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    document_signed: Optional[bool] = None
    envelope_id: Optional[str] = None
    document_url: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    document_signed: bool
    envelope_id: Optional[str] = None
    document_url: Optional[str] = None

    class Config:
        orm_mode = True

# Response models
class StatusResponse(BaseModel):
    status: str
    message: str

class ErrorResponse(BaseModel):
    detail: str
