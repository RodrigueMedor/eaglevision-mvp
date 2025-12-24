import os
import bcrypt
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db')

def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_admin_user():
    """Create an admin user in the PostgreSQL database."""
    try:
        # Create a database connection
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            # Check if admin user already exists
            result = connection.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": "admin@eaglevision.com"}
            )
            
            if result.fetchone():
                print("Admin user already exists. Updating password...")
                # Update existing admin user
                connection.execute(
                    text("""
                    UPDATE users 
                    SET hashed_password = :hashed_password,
                        is_active = TRUE,
                        is_verified = TRUE,
                        role = 'ADMIN'
                    WHERE email = :email
                    """),
                    {
                        "hashed_password": get_password_hash("Admin@123"),
                        "email": "admin@eaglevision.com"
                    }
                )
                print("Admin user updated successfully!")
            else:
                # Create new admin user
                print("Creating new admin user...")
                connection.execute(
                    text("""
                    INSERT INTO users (
                        email, 
                        hashed_password, 
                        full_name, 
                        phone, 
                        role, 
                        is_active, 
                        is_verified
                    ) VALUES (
                        :email, 
                        :hashed_password, 
                        :full_name, 
                        :phone, 
                        'ADMIN', 
                        :is_active, 
                        :is_verified
                    )
                    """),
                    {
                        "email": "admin@eaglevision.com",
                        "hashed_password": get_password_hash("Admin@123"),
                        "full_name": "Admin User",
                        "phone": "123-456-7890",
                        "role": "admin",
                        "is_active": True,
                        "is_verified": True
                    }
                )
                print("Admin user created successfully!")
            
            # No need to explicitly commit - the transaction is committed when the 'with' block ends
            pass
            
    except Exception as e:
        print(f"Error creating admin user: {e}")
        raise

if __name__ == "__main__":
    print("🔑 Setting up admin user in PostgreSQL database...")
    create_admin_user()
    print("✅ Done!")
