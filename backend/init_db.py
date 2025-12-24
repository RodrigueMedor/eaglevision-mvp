import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Load environment variables
env_path = project_root / '.env'
load_dotenv(env_path)

# Import after setting up paths
from backend.database import Base, engine, init_db

if __name__ == "__main__":
    print("Initializing database...")
    # This will create all tables defined in models
    Base.metadata.create_all(bind=engine)
    print("Database initialization complete!")
