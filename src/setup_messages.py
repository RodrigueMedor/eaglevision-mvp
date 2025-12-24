import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models.user import User
from message_models import Message, MessageRecipient, MessageStatus, MessageType, MessageRecipientType

# Import models to ensure they are registered with SQLAlchemy
from models import *

# Create tables
def create_tables():
    print("Creating database tables...")
    # Create all tables in the correct order
    Base.metadata.create_all(bind=engine, tables=[
        Message.__table__,
        MessageRecipient.__table__
    ])
    print("Tables created successfully!")

def create_test_messages():
    db = SessionLocal()
    
    try:
        # Get or create a test user
        from backend.models.user import User
        user = db.query(User).filter(User.email == "test@example.com").first()
        if not user:
            print("Creating test user...")
            user = User(
                email="test@example.com",
                full_name="Test User",
                phone="1234567890",
                role="admin",
                is_active=True,
                is_verified=True
            )
            user.set_password("testpassword")
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created test user with ID: {user.id}")
        
        # Create some test messages
        print("Creating test messages...")
        now = datetime.utcnow()
        
        # Message 1: Inbox message
        message1 = Message(
            sender_id=1,  # Assuming admin user is ID 1
            subject="Welcome to Eagle Vision",
            content="Thank you for signing up to Eagle Vision. We're excited to have you on board!",
            message_type=MessageType.EMAIL,
            status=MessageStatus.SENT,
            recipient_type=RecipientType.SPECIFIC,
            recipient_id=user.id,
            sent_at=now - timedelta(days=1),
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1)
        )
        db.add(message1)
        db.commit()
        db.refresh(message1)
        
        # Add recipient
        recipient1 = MessageRecipient(
            message_id=message1.id,
            recipient_id=user.id,
            status=MessageStatus.DELIVERED,
            delivered_at=now - timedelta(hours=23)
        )
        db.add(recipient1)
        
        # Message 2: Another message
        message2 = Message(
            sender_id=user.id,
            subject="Your appointment is confirmed",
            content="Your appointment for tomorrow at 2 PM has been confirmed.",
            message_type=MessageType.EMAIL,
            status=MessageStatus.SENT,
            recipient_type=RecipientType.SPECIFIC,
            recipient_id=1,  # Admin
            sent_at=now - timedelta(hours=12),
            created_at=now - timedelta(hours=12),
            updated_at=now - timedelta(hours=12)
        )
        db.add(message2)
        db.commit()
        db.refresh(message2)
        
        # Add recipient
        recipient2 = MessageRecipient(
            message_id=message2.id,
            recipient_id=1,  # Admin
            status=MessageStatus.DELIVERED,
            delivered_at=now - timedelta(hours=11)
        )
        db.add(recipient2)
        
        db.commit()
        print(f"Created test messages with IDs: {message1.id}, {message2.id}")
        
    except Exception as e:
        print(f"Error creating test messages: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import enum  # Moved here to avoid circular imports
    
    # Create tables
    create_tables()
    
    # Create test messages
    create_test_messages()
    
    print("Setup completed successfully!")
