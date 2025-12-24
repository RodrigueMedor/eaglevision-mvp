"""Simple script to add missing columns to the appointments table."""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment or use default PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db")

def add_columns():
    """Add missing columns to the appointments table."""
    try:
        # Create SQLAlchemy engine
        engine = create_engine(DATABASE_URL)
        
        # SQL statements to add columns if they don't exist
        sql_statements = [
            """
            DO $$
            BEGIN
                -- Add document_signed column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='document_signed') THEN
                    ALTER TABLE appointments ADD COLUMN document_signed BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
                
                -- Add envelope_id column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='envelope_id') THEN
                    ALTER TABLE appointments ADD COLUMN envelope_id VARCHAR;
                END IF;
                
                -- Add document_url column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='document_url') THEN
                    ALTER TABLE appointments ADD COLUMN document_url VARCHAR;
                END IF;
                
                -- Add first_name column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='first_name') THEN
                    ALTER TABLE appointments ADD COLUMN first_name VARCHAR;
                END IF;
                
                -- Add last_name column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='last_name') THEN
                    ALTER TABLE appointments ADD COLUMN last_name VARCHAR;
                END IF;
                
                -- Add email column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='email') THEN
                    ALTER TABLE appointments ADD COLUMN email VARCHAR;
                END IF;
                
                -- Add phone column if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='appointments' AND column_name='phone') THEN
                    ALTER TABLE appointments ADD COLUMN phone VARCHAR;
                END IF;
            END $$;
            """
        ]
        
        # Execute the SQL statements
        with engine.connect() as conn:
            with conn.begin():
                for sql in sql_statements:
                    conn.execute(text(sql))
        
        print("Successfully added missing columns to the appointments table.")
        return True
        
    except Exception as e:
        print(f"Error adding columns: {e}")
        return False

if __name__ == "__main__":
    if add_columns():
        exit(0)
    else:
        exit(1)
