import sys
import bcrypt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Database configuration
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

# Initialize database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_user_password(email: str, password: str):
    # Hash the password using bcrypt
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update the database
    db = SessionLocal()
    try:
        # Update the password
        result = db.execute(
            text("UPDATE users SET hashed_password = :hashed_password WHERE email = :email"),
            {"hashed_password": hashed_password, "email": email}
        )
        db.commit()
        
        if result.rowcount == 0:
            print(f"Error: No user found with email {email}")
            return False
            
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
        print("Usage: python update_password_direct.py <email> <new_password>")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    
    if len(password) > 72:
        print("Error: Password is too long (max 72 characters).")
        sys.exit(1)
        
    update_user_password(email, password)
