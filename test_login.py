import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Now import the auth module
from backend.auth import verify_password, get_password_hash

# Database connection
DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

try:
    # Get the admin user
    result = db.execute(
        text("""
            SELECT id, email, hashed_password, is_active, is_verified 
            FROM users 
            WHERE email = :email
        """),
        {"email": "admin@eaglevision.com"}
    )
    
    admin = result.first()
    
    if not admin:
        print("❌ Admin user not found")
        sys.exit(1)
        
    print(f"✅ Found admin user: {admin[1]}")
    print(f"ID: {admin[0]}")
    print(f"Active: {admin[3]}")
    print(f"Verified: {admin[4]}")
    
    # Test password verification
    test_password = "Admin@123"
    is_valid = verify_password(test_password, admin[2])
    print(f"\n🔑 Testing password: {test_password}")
    print(f"Password valid: {'✅' if is_valid else '❌'}")
    
    if not is_valid:
        print("\nGenerating a new password hash...")
        new_hash = get_password_hash(test_password)
        print(f"New hash: {new_hash}")
        
        update = input("\nWould you like to update the password hash? (y/n): ")
        if update.lower() == 'y':
            db.execute(
                text("UPDATE users SET hashed_password = :hash WHERE id = :id"),
                {"hash": new_hash, "id": admin[0]}
            )
            db.commit()
            print("✅ Password hash updated successfully!")
            
            # Verify the new hash
            is_valid = verify_password(test_password, new_hash)
            print(f"Verification after update: {'✅' if is_valid else '❌'}")
            
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
