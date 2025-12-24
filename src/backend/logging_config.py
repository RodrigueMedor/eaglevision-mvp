import logging
import sys
from pathlib import Path

# Create logs directory if it doesn't exist
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture all logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Log to console
        logging.FileHandler('logs/app.log')  # Log to file
    ]
)

# Set log levels for specific loggers
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)  # Reduce SQLAlchemy log verbosity
logging.getLogger('passlib').setLevel(logging.WARNING)  # Reduce passlib log verbosity

# Get logger for this module
logger = logging.getLogger(__name__)

def get_logger(name):
    """Get a logger with the specified name."""
    return logging.getLogger(name)
