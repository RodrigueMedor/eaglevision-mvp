import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import the models
try:
    from backend.database import Base
    from backend.models import User, Appointment
    from backend.message_models import Message, MessageRecipient
    
    # Database connection string
    DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'
    print(f"Using database: {DATABASE_URL}")
    
    # Create engine and session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    print("Dropping and recreating all tables...")
    
    # Drop all tables first
    Base.metadata.drop_all(engine)
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    print("Database schema updated successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
