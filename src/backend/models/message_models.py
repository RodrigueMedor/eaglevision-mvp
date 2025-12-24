from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr
import enum

# Import Base from .base to avoid circular imports
from .base import Base

class MessageStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"

class MessageType(str, enum.Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"
    IN_APP = "IN_APP"

class MessageRecipientType(str, enum.Enum):
    ALL = "all"
    CLIENT = "client"
    STAFF = "staff"
    SPECIFIC = "specific"

class Message(Base):
    __tablename__ = "messages"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.EMAIL, nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.DRAFT, nullable=False)
    recipient_type = Column(Enum(MessageRecipientType), nullable=False)
    recipient_id = Column(Integer, nullable=True)  # Only used if recipient_type is SPECIFIC
    scheduled_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships - using string-based references to avoid circular imports
    sender = relationship("User", 
                         foreign_keys="Message.sender_id", 
                         back_populates="sent_messages",
                         lazy="select")
    
    recipients = relationship("MessageRecipient", 
                            back_populates="message", 
                            cascade="all, delete-orphan",
                            lazy="select")

class MessageRecipient(Base):
    __tablename__ = "message_recipients"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey('messages.id'), nullable=False)
    recipient_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.DRAFT, nullable=False)
    read_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    
    # Relationships - using string-based references to avoid circular imports
    message = relationship("Message", 
                         back_populates="recipients", 
                         foreign_keys="MessageRecipient.message_id",
                         lazy="select")
    
    recipient = relationship("User", 
                           foreign_keys="MessageRecipient.recipient_id", 
                           back_populates="received_messages",
                           lazy="select")
