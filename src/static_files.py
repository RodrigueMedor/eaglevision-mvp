from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

def setup_static_files(app: FastAPI):
    """
    Set up static file serving for uploaded files.
    
    This should be called in the main FastAPI application startup.
    """
    # Create uploads directory if it doesn't exist
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Mount the uploads directory to serve static files
    app.mount(
        "/uploads",
        StaticFiles(directory=str(uploads_dir)),
        name="uploads"
    )
    
    # Also create a symlink from /static to /uploads for backward compatibility
    static_dir = Path("static")
    if not static_dir.exists() and not static_dir.is_symlink():
        try:
            static_dir.symlink_to(uploads_dir, target_is_directory=True)
        except OSError as e:
            # On Windows, we might not have permission to create symlinks
            # In that case, we'll just create the directory
            if os.name == 'nt':  # Windows
                static_dir.mkdir(exist_ok=True)
