import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database connection string
DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_tables():
    """Check if the required tables exist in the database."""
    try:
        # Get table names
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print("Tables in database:", tables)
        
        # Check for required tables
        required_tables = ['users', 'messages', 'message_recipients']
        missing_tables = [t for t in required_tables if t not in tables]
        
        if missing_tables:
            print(f"Missing tables: {missing_tables}")
            return False
            
        print("All required tables exist!")
        return True
        
    except Exception as e:
        print(f"Error checking tables: {e}")
        return False

if __name__ == "__main__":
    from sqlalchemy import inspect
    
    print("Checking database connection and tables...")
    
    # Test connection
    try:
        with engine.connect() as conn:
            print("Successfully connected to the database!")
    except Exception as e:
        print(f"Failed to connect to the database: {e}")
        sys.exit(1)
    
    # Check tables
    if not check_tables():
        print("Some required tables are missing. You may need to run migrations or create the tables.")
        
        # Ask if user wants to create the tables
        create_tables = input("Do you want to create the tables? (y/n): ").strip().lower()
        if create_tables == 'y':
            try:
                from backend.database import Base
                from backend.models import User, Appointment
                from backend.message_models import Message, MessageRecipient
                
                print("Creating tables...")
                Base.metadata.create_all(engine)
                print("Tables created successfully!")
            except Exception as e:
                print(f"Error creating tables: {e}")
                import traceback
                traceback.print_exc()
    
    print("Database check complete.")
