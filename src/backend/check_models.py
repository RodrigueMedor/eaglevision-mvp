import sys
import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database connection string
DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_models():
    """Check if models can be imported and have correct relationships."""
    try:
        # Import models
        from backend.database import Base
        from backend.models import User, Appointment
        from backend.message_models import Message, MessageRecipient
        
        print("All models imported successfully!")
        
        # Check relationships
        print("\nChecking relationships...")
        
        # Check User model relationships
        user_relationships = [
            (User, 'sent_messages', 'backref from Message.sender'),
            (User, 'received_messages', 'backref from MessageRecipient.recipient'),
            (User, 'appointments', 'relationship to Appointment')
        ]
        
        for model, rel_name, desc in user_relationships:
            rel = getattr(model, rel_name, None)
            if rel is None:
                print(f"❌ {model.__name__}.{rel_name} is missing! ({desc})")
            else:
                print(f"✅ {model.__name__}.{rel_name} exists ({desc})")
        
        # Check Message model relationships
        message = Message()
        if hasattr(message, 'sender'):
            print("✅ Message.sender relationship exists")
        else:
            print("❌ Message.sender relationship is missing")
            
        if hasattr(message, 'recipients'):
            print("✅ Message.recipients relationship exists")
        else:
            print("❌ Message.recipients relationship is missing")
        
        # Check MessageRecipient model relationships
        recipient = MessageRecipient()
        if hasattr(recipient, 'message'):
            print("✅ MessageRecipient.message relationship exists")
        else:
            print("❌ MessageRecipient.message relationship is missing")
            
        if hasattr(recipient, 'recipient'):
            print("✅ MessageRecipient.recipient relationship exists")
        else:
            print("❌ MessageRecipient.recipient relationship is missing")
        
        return True
        
    except Exception as e:
        print(f"Error checking models: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Checking models and relationships...")
    if check_models():
        print("\n✅ Model checks completed successfully!")
    else:
        print("\n❌ Model checks failed. See errors above.")
