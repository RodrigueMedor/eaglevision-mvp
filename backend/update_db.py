import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def update_database():
    # Database configuration
    DATABASE_URL = os.getenv('DATABASE_URL', "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db")
    
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Start a transaction
        with connection.begin():
            # Check if updated_at column exists
            result = connection.execute(
                text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='contacts' AND column_name='updated_at';
                """)
            )
            
            if not result.fetchone():
                print("Adding updated_at column to contacts table...")
                # Add the column with a default value
                connection.execute(
                    text("""
                    ALTER TABLE contacts 
                    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                    """)
                )
                print("Successfully added updated_at column to contacts table")
            else:
                print("updated_at column already exists in contacts table")

if __name__ == "__main__":
    update_database()
