from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
import enum

class Role(enum.Enum):
    CLIENT = "client"
    STAFF = "staff"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(Role), default=Role.CLIENT, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - using string-based references to avoid circular imports
    sent_messages = relationship("Message", 
                               back_populates="sender", 
                               foreign_keys="[Message.sender_id]",
                               cascade="all, delete-orphan",
                               lazy="select")
    
    received_messages = relationship("MessageRecipient", 
                                   back_populates="recipient",
                                   foreign_keys="[MessageRecipient.recipient_id]",
                                   cascade="all, delete-orphan",
                                   lazy="select")
    
    appointments = relationship("Appointment", 
                              back_populates="user", 
                              cascade="all, delete-orphan",
                              lazy="select")
