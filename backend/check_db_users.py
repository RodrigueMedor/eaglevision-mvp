import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database connection string - using PostgreSQL
DATABASE_URL = "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db"

def check_database():
    try:
        # Create a database engine
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            print("✅ Successfully connected to the database")
            
            # Check if the users table exists
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users';
            """))
            
            if result.fetchone():
                print("✅ Found 'users' table")
                
                # Count users
                result = connection.execute(text("SELECT COUNT(*) FROM users"))
                user_count = result.scalar()
                print(f"📊 Total users in database: {user_count}")
                
                # List all users
                if user_count > 0:
                    print("\n👥 List of users:")
                    result = connection.execute(text("""
                        SELECT id, email, is_active, is_verified, role 
                        FROM users;
                    """))
                    
                    for row in result:
                        print(f"ID: {row[0]}, Email: {row[1]}, Active: {row[2]}, Verified: {row[3]}, Role: {row[4]}")
            else:
                print("❌ 'users' table not found in the database")
                
    except Exception as e:
        print(f"❌ Error connecting to the database: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    print("🔍 Checking database connection and users...")
    check_database()
