import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import necessary modules
from backend.database import get_db
from backend.models import User, Role
from backend.routers.auth import create_token_response
from backend.routers.auth import TokenResponse

# Database connection
DATABASE_URL = 'postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db'
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

try:
    # Get the admin user
    admin = db.query(User).filter(User.email == 'admin@eaglevision.com').first()
    
    if not admin:
        print("❌ Admin user not found")
        sys.exit(1)
    
    print(f"✅ Found admin user: {admin.email}")
    print(f"ID: {admin.id}, Active: {admin.is_active}, Verified: {admin.is_verified}")
    
    # Test token creation
    print("\nTesting token creation...")
    try:
        # Import the create_token_response function with all its dependencies
        from backend.auth import (
            create_access_token, 
            create_refresh_token,
            ACCESS_TOKEN_EXPIRE_MINUTES,
            REFRESH_TOKEN_EXPIRE_DAYS,
            SECRET_KEY,
            ALGORITHM
        )
        from datetime import datetime, timedelta
        import uuid
        import jwt
        
        print("Creating access token...")
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": str(admin.id),
            "role": admin.role.name if admin.role else "user",
            "email": admin.email or "",
            "exp": datetime.utcnow() + access_token_expires
        }
        access_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        print(f"✅ Access token created: {access_token[:50]}...")
        
        print("\nCreating refresh token...")
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_data = {
            "sub": str(admin.id),
            "jti": str(uuid.uuid4()),
            "tf": str(uuid.uuid4()),
            "exp": datetime.utcnow() + refresh_token_expires
        }
        refresh_token = jwt.encode(refresh_token_data, SECRET_KEY, algorithm=ALGORITHM)
        print(f"✅ Refresh token created: {refresh_token[:50]}...")
        
    except Exception as e:
        print(f"❌ Error creating tokens: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test the create_token_response function
    print("\nTesting create_token_response...")
    try:
        from backend.routers.auth import create_token_response as ctr
        from fastapi import Request
        from fastapi.testclient import TestClient
        from backend.main import app
        
        # Create a test request
        test_request = Request(
            scope={
                "type": "http",
                "method": "POST",
                "path": "/api/auth/login-json",
                "headers": {},
                "query_string": b"",
                "client": ("127.0.0.1", 12345)
            }
        )
        
        # Call the async function with asyncio
        import asyncio
        
        async def test_async():
            return await ctr(admin, db)
            
        # Run the async function
        token_response = asyncio.run(test_async())
        print("✅ create_token_response successful!")
        print(f"Access Token: {token_response.access_token[:50]}...")
        print(f"Refresh Token: {token_response.refresh_token[:50]}...")
        
    except Exception as e:
        print(f"❌ Error in create_token_response: {str(e)}")
        import traceback
        traceback.print_exc()
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    
finally:
    db.close()
    print("\nTest completed.")
