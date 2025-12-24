import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Now import the models
try:
    from database import Base
    from models import User, Appointment
    from message_models import Message, MessageRecipient
    
    # Create all tables
    engine = create_engine('postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db')
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
