"""Script to apply database migrations."""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://eaglevision_user:eaglevision_password@localhost:5432/eaglevision_db")

def apply_migration():
    """Apply the database migration."""
    try:
        # Create SQLAlchemy engine
        engine = create_engine(DATABASE_URL)
        
        # Create a session
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Read the migration SQL
        with open('migrations/add_docusign_columns.py', 'r') as f:
            migration_sql = f.read()
        
        # Extract the upgrade function content
        upgrade_start = migration_sql.find('def upgrade():') + len('def upgrade():\n')
        upgrade_end = migration_sql.find('def downgrade():')
        upgrade_content = migration_sql[upgrade_start:upgrade_end].strip()
        
        # Remove indentation
        upgrade_lines = [line[4:] for line in upgrade_content.split('\n')]
        upgrade_sql = '\n'.join(line for line in upgrade_lines if line.strip())
        
        # Execute the SQL
        with engine.connect() as conn:
            # Wrap in a transaction
            with conn.begin():
                for statement in upgrade_sql.split(';'):
                    if statement.strip():
                        conn.execute(statement + ';')
        
        print("Migration applied successfully!")
        return True
        
    except SQLAlchemyError as e:
        print(f"Error applying migration: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if 'session' in locals():
            session.close()

if __name__ == "__main__":
    if apply_migration():
        sys.exit(0)
    else:
        sys.exit(1)
