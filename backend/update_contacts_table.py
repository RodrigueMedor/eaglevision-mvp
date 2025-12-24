import os
import sys
from pathlib import Path
from sqlalchemy import text

# Add the backend directory to the Python path
backend_dir = str(Path(__file__).parent.absolute())
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from database import engine, Base
from models import *
from contact_models import *

def add_updated_at_column():
    """Add updated_at column to contacts table if it doesn't exist"""
    with engine.connect() as connection:
        # Check if column exists
        result = connection.execute(
            text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contacts' AND column_name='updated_at';
            """)
        )
        
        if not result.fetchone():
            # Add the column if it doesn't exist
            connection.execute(
                text("""
                ALTER TABLE contacts 
                ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                """)
            )
            connection.commit()
            print("Successfully added updated_at column to contacts table")
        else:
            print("updated_at column already exists in contacts table")

if __name__ == "__main__":
    add_updated_at_column()
