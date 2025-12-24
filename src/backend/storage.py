import os
import uuid
from pathlib import Path
from typing import Optional, BinaryIO, Tuple
import shutil
from fastapi import UploadFile, HTTPException, status
import logging

logger = logging.getLogger(__name__)

class Storage:
    def __init__(self, base_path: str = "uploads"):
        """
        Initialize the storage with a base path.
        
        Args:
            base_path: Base directory where files will be stored
        """
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def save_upload_file(
        self, 
        file: UploadFile, 
        subfolder: str = "",
        allowed_types: Optional[list] = None,
        max_size: int = 5 * 1024 * 1024,  # 5MB default
        filename: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Save an uploaded file to the storage.
        
        Args:
            file: The uploaded file
            subfolder: Subfolder within the base path
            allowed_types: List of allowed MIME types
            max_size: Maximum file size in bytes
            filename: Custom filename (without extension)
            
        Returns:
            Tuple of (relative_path, file_url)
        """
        if allowed_types is None:
            allowed_types = ["image/jpeg", "image/png", "image/jpg"]
            
        # Validate file type
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Read file content to validate size
        contents = await file.read()
        if len(contents) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds {max_size / (1024 * 1024)}MB limit"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Generate a unique filename if not provided
        ext = Path(file.filename).suffix.lower()
        if not filename:
            filename = f"{uuid.uuid4().hex}{ext}"
        else:
            filename = f"{filename}{ext}"
        
        # Create subfolder if it doesn't exist
        save_path = self.base_path / subfolder
        save_path.mkdir(parents=True, exist_ok=True)
        
        # Save the file
        file_path = save_path / filename
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Generate URL (in production, this would be a CDN URL)
        relative_path = str(file_path.relative_to(self.base_path))
        file_url = f"/{self.base_path.name}/{relative_path}"
        
        return str(file_path), file_url
    
    def get_file_path(self, relative_path: str) -> Optional[Path]:
        """
        Get the full path to a stored file.
        
        Args:
            relative_path: Path relative to the base storage directory
            
        Returns:
            Path object if file exists, None otherwise
        """
        file_path = self.base_path / relative_path
        return file_path if file_path.exists() else None
    
    def delete_file(self, relative_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            relative_path: Path relative to the base storage directory
            
        Returns:
            True if file was deleted, False if it didn't exist
        """
        file_path = self.base_path / relative_path
        if file_path.exists():
            try:
                file_path.unlink()
                return True
            except Exception as e:
                logger.error(f"Error deleting file {file_path}: {str(e)}")
                return False
        return False

# Initialize a default storage instance
storage = Storage()
