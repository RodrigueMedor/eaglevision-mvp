import sys
import crypt
from getpass import getpass
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Database configuration
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

# Initialize database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_user_password(email: str, new_password: str):
    # Generate a random salt and hash the password
    # Using crypt with SHA-512 (more secure than bcrypt in this case)
    # The $6$ indicates SHA-512, followed by a random salt
    import random
    import string
    
    # Generate a random 16-character salt
    salt = ''.join(random.choices(string.ascii_letters + string.digits + './', k=16))
    hashed_password = crypt.crypt(new_password, f"$6${salt}$")
    
    # Update the database
    db = SessionLocal()
    try:
        # Find the user
        from sqlalchemy import text
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
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_password_simple.py <email> <new_password>")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    
    if len(password) > 72:
        print("Error: Password is too long (max 72 characters).")
        sys.exit(1)
        
    update_user_password(email, password)
