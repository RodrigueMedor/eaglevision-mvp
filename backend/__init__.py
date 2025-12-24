# This file makes the backend directory a Python package
import logging
import os
from pathlib import Path

# Set up logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture all logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Log to console
        logging.FileHandler('logs/app.log')  # Log to file
    ]
)

# Set log levels for specific loggers
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)  # Reduce SQLAlchemy log verbosity
logging.getLogger('passlib').setLevel(logging.WARNING)  # Reduce passlib log verbosity

# Import modules after setting up logging
from . import models, schemas, crud, database, auth

__all__ = [
    'models',
    'schemas',
    'crud',
    'database',
    'auth'
]
