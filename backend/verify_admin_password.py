import sys
import os
from sqlalchemy import create_engine, text
import bcrypt

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database connection string - using PostgreSQL
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

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

def check_admin_password():
    try:
        # Create engine and connect to the database
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        
        with engine.connect() as connection:
            # Get the admin user
            result = connection.execute(
                text("""
                    SELECT id, email, hashed_password, is_active, is_verified, role 
                    FROM users 
                    WHERE email = :email
                """),
                {"email": "admin@eaglevision.com"}
            )
            
            admin = result.fetchone()
            
            if not admin:
                print("❌ Admin user not found in the database")
                return
                
            print(f"✅ Found admin user: {admin[1]}")
            print(f"ID: {admin[0]}")
            print(f"Active: {bool(admin[3])}")
            print(f"Verified: {bool(admin[4])}")
            print(f"Role: {admin[5]}")
            
            # Test the password
            password = "Admin@123"
            is_valid = verify_password(password, admin[2])
            
            print(f"\n🔑 Testing password: {password}")
            print(f"Password valid: {'✅' if is_valid else '❌'}")
            
            if not is_valid:
                print("\n⚠️  The password is incorrect. Here's what you can do:")
                print("1. Try a different password")
                print("2. Reset the admin password using the create_admin.py script")
                print("   Command: python3 create_admin.py")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 Verifying admin password...")
    check_admin_password()
