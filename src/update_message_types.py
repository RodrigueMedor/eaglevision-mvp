import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eaglevision")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_message_types():
    db = SessionLocal()
    try:
        # Get all messages with lowercase message types
        result = db.execute(
            "SELECT id, message_type FROM messages WHERE message_type != UPPER(message_type)"
        )
        messages = result.fetchall()
        
        if not messages:
            print("No messages with lowercase message types found.")
            return
            
        print(f"Found {len(messages)} messages with lowercase message types.")
        
        # Update each message to use uppercase message type
        for msg_id, msg_type in messages:
            if msg_type:
                new_type = msg_type.upper()
                db.execute(
                    "UPDATE messages SET message_type = :new_type WHERE id = :id",
                    {"new_type": new_type, "id": msg_id}
                )
                print(f"Updated message {msg_id}: {msg_type} -> {new_type}")
        
        # Commit the changes
        db.commit()
        print("Successfully updated all message types to uppercase.")
        
    except Exception as e:
        db.rollback()
        print(f"Error updating message types: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting message type update...")
    update_message_types()
