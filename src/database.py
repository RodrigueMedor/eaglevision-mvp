import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
project_root = Path(__file__).parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)

# Get database URL from environment variables
DATABASE_URL = os.getenv('DATABASE_URL')

# Fallback to default if not set
if not DATABASE_URL:
    DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

print(f"Using database: {DATABASE_URL}")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a scoped session factory
SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)

# Create a base class for models
# This will be used by all models
Base = declarative_base()

# Note: Models should import Base from this file to avoid circular imports

def get_db():
    """
    Dependency to get DB session.
    Use this in your FastAPI path operations.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize the database by creating all tables.
    Run this once when the application starts.
    """
    # Import models here to avoid circular imports
    from models import Base
    from contact_models import Base as ContactBase
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    ContactBase.metadata.create_all(bind=engine)
    print("Database tables created successfully")
