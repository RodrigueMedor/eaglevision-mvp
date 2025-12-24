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
    is_verified = Column(Boolean, default=True)  # Set to True for admin
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

def get_password_hash(password: str) -> str:
    # Convert the password to bytes if it's not already
    if isinstance(password, str):
        password = password.encode('utf-8')
    
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    
    # Return the hashed password as a string
    return hashed.decode('utf-8')

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(
            User.email == "admin@eaglevision.com"
        ).first()
        
        if admin:
            print("Admin user already exists. Updating password...")
            admin.hashed_password = get_password_hash("Admin@123")
            admin.is_active = True
            admin.is_verified = True
            admin.role = Role.ADMIN
        else:
            print("Creating new admin user...")
            admin = User(
                email="admin@eaglevision.com",
                hashed_password=get_password_hash("Admin@123"),
                full_name="Admin User",
                phone="123-456-7890",
                role=Role.ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin)
        
        db.commit()
        print("Admin user created/updated successfully!")
        print(f"Email: admin@eaglevision.com")
        print(f"Password: Admin@123")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Create or update admin user
    create_admin_user()
