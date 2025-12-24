import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import Base, get_db
from backend.models import User
from backend.auth import get_password_hash

# Database connection URL
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def update_admin_password():
    db = SessionLocal()
    try:
        # Get the admin user
        admin = db.query(User).filter(User.email == 'admin@example.com').first()
        if not admin:
            print("Admin user not found!")
            return
        
        # Set the new password
        new_password = "admin123"
        admin.hashed_password = get_password_hash(new_password)
        
        # Commit the changes
        db.commit()
        print("Admin password updated successfully!")
        
        # Verify the update
        updated_admin = db.query(User).filter(User.email == 'admin@example.com').first()
        print(f"Updated admin details:")
        print(f"Email: {updated_admin.email}")
        print(f"Is Active: {updated_admin.is_active}")
        print(f"Is Verified: {updated_admin.is_verified}")
        print(f"Role: {updated_admin.role}")
        print(f"Password Hash Length: {len(updated_admin.hashed_password)}")
        print(f"Password Hash Prefix: {updated_admin.hashed_password[:10]}...")
        
    except Exception as e:
        print(f"Error updating admin password: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_admin_password()
