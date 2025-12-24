import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
import enum
from datetime import datetime
import bcrypt

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database connection string - using PostgreSQL
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class for models
Base = declarative_base()

# Define Role enum
class Role(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CLIENT = "client"

# Define User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(Enum(Role), default=Role.CLIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Convert the plain password to bytes if it's not already
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        
        # Convert the hashed password to bytes if it's not already
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
            
        # Verify the password using bcrypt
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception as e:
        print(f"Error verifying password: {e}")
        return False

def check_admin_credentials():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin = db.query(User).filter(
            User.email == "admin@eaglevision.com"
        ).first()
        
        if not admin:
            print("Error: Admin user not found in the database")
            return
            
        print(f"Admin user found: {admin.email}")
        print(f"Full name: {admin.full_name}")
        print(f"Role: {admin.role}")
        print(f"Is active: {admin.is_active}")
        print(f"Is verified: {admin.is_verified}")
        
        # Verify the password
        password = "Admin@123"
        is_valid = verify_password(password, admin.hashed_password)
        print(f"\nPassword verification: {'SUCCESS' if is_valid else 'FAILED'}")
        
        # Print the hashed password for debugging
        print(f"\nHashed password in DB: {admin.hashed_password}")
        
        # Print the hash of the test password for comparison
        test_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        print(f"\nHash of test password: {test_hash.decode('utf-8')}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_admin_credentials()
