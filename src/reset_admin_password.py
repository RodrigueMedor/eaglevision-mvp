import sys
import os
from sqlalchemy import create_engine, text
from backend.auth import get_password_hash

# Database connection
DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'
engine = create_engine(DATABASE_URL)

# New admin password
new_password = "Admin@123"
hashed_password = get_password_hash(new_password)

try:
    with engine.connect() as conn:
        # Check if admin exists
        result = conn.execute(
            text('SELECT id FROM users WHERE email = :email'), 
            {'email': 'admin@eaglevision.com'}
        )
        admin = result.first()
        
        if not admin:
            print("Admin user not found. Creating admin user...")
            conn.execute(
                text('''
                    INSERT INTO users 
                    (email, hashed_password, full_name, phone, is_active, is_verified, role, created_at, updated_at)
                    VALUES 
                    (:email, :hashed_password, 'Admin User', '1234567890', true, true, 'admin', NOW(), NOW())
                    RETURNING id
                '''),
                {'email': 'admin@eaglevision.com', 'hashed_password': hashed_password}
            )
            print("Admin user created successfully!")
        else:
            # Update existing admin password
            conn.execute(
                text('''
                    UPDATE users 
                    SET hashed_password = :hashed_password, 
                        is_active = true, 
                        is_verified = true,
                        updated_at = NOW()
                    WHERE email = :email
                '''),
                {'email': 'admin@eaglevision.com', 'hashed_password': hashed_password}
            )
            print("Admin password updated successfully!")
        
        conn.commit()
        print(f"New password set to: {new_password}")
        
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
