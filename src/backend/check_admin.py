from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from backend.auth import verify_password

def check_admin_credentials():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin = db.query(models.User).filter(
            models.User.email == "admin@eaglevision.com"
        ).first()
        
        if not admin:
            print("Error: Admin user not found in the database")
            return
            
        print(f"Admin user found: {admin.email}")
        print(f"Is active: {admin.is_active}")
        
        # Verify the password
        password = "Admin@123"
        is_valid = verify_password(password, admin.hashed_password)
        print(f"Password verification: {'SUCCESS' if is_valid else 'FAILED'}")
        
        # Print the hashed password for debugging
        print(f"Hashed password in DB: {admin.hashed_password}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_admin_credentials()
