# Import Base from database to avoid circular imports
from sqlalchemy.ext.declarative import declarative_base

# Create a base class for declarative models
Base = declarative_base()

__all__ = ['Base']
