import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from passlib.context import CryptContext

# Database configuration
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

# Initialize database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_user_password(email: str, new_password: str):
    # Initialize password context with bcrypt
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Hash the new password
    hashed_password = pwd_context.hash(new_password)
    
    # Update the database
    db = SessionLocal()
    try:
        # Find the user
        user = db.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        
        if not user:
            print(f"Error: User with email {email} not found.")
            return False
            
        # Update the password
        db.execute(
            text("UPDATE users SET hashed_password = :hashed_password WHERE email = :email"),
            {"hashed_password": hashed_password, "email": email}
        )
        db.commit()
        print(f"Password for {email} has been updated successfully.")
        print(f"New hashed password: {hashed_password}")
        return True
        
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_password_final.py <email> <new_password>")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    
    if len(password) > 72:
        print("Error: Password is too long (max 72 characters).")
        sys.exit(1)
        
    update_user_password(email, password)
