import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models to ensure they're registered with SQLAlchemy
from backend.models import Base
from backend.models.user import User, Role
from backend.models.appointment import Appointment, AppointmentStatus
from backend.message_models import Message, MessageRecipient, MessageStatus, MessageType, MessageRecipientType

# Database connection string
DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'

def update_database():
    try:
        print("Connecting to database...")
        engine = create_engine(DATABASE_URL)
        
        # Create all tables
        print("Creating/updating database tables...")
        Base.metadata.create_all(engine)
        
        print("✅ Database schema updated successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error updating database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting database update...")
    if update_database():
        print("✅ Database update completed successfully!")
    else:
        print("❌ Database update failed. Please check the error messages above.")
        sys.exit(1)
