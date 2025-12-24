import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models.user import User
from backend.message_models import Message, MessageRecipient, MessageStatus, MessageType, MessageRecipientType

def create_test_messages():
    db = SessionLocal()
    
    try:
        # Get or create a test user
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
            recipient_type=MessageRecipientType.SPECIFIC,
            recipient_id=user.id,
            sent_at=now - timedelta(days=1),
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1)
        )
        db.add(message1)
        db.flush()  # Flush to get the message ID
        
        # Add recipient for message 1
        recipient1 = MessageRecipient(
            message_id=message1.id,
            recipient_id=user.id,
            status=MessageStatus.DELIVERED,
            delivered_at=now - timedelta(days=1),
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1)
        )
        db.add(recipient1)
        
        # Message 2: Sent message
        message2 = Message(
            sender_id=user.id,
            subject="Question about my appointment",
            content="Hi, I have a question about my upcoming appointment.",
            message_type=MessageType.EMAIL,
            status=MessageStatus.SENT,
            recipient_type=MessageRecipientType.STAFF,
            sent_at=now - timedelta(hours=12),
            created_at=now - timedelta(hours=13),
            updated_at=now - timedelta(hours=12)
        )
        db.add(message2)
        db.flush()
        
        # Add admin as recipient for message 2
        recipient2 = MessageRecipient(
            message_id=message2.id,
            recipient_id=1,  # Assuming admin user is ID 1
            status=MessageStatus.DELIVERED,
            delivered_at=now - timedelta(hours=12),
            created_at=now - timedelta(hours=13),
            updated_at=now - timedelta(hours=12)
        )
        db.add(recipient2)
        
        db.commit()
        print("Successfully created test messages!")
        print(f"- User ID: {user.id}")
        print(f"- Message 1 (Inbox): {message1.id}")
        print(f"- Message 2 (Sent): {message2.id}")
        
    except Exception as e:
        print(f"Error creating test messages: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating test messages...")
    create_test_messages()
