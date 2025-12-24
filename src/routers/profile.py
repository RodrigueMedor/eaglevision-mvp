from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
from datetime import datetime

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..security import limiter
from ..storage import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["Profile"])

@router.get("", response_model=schemas.UserResponse)
@limiter.limit("100/hour")
async def get_profile(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's profile information.
    """
    try:
        return current_user
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching profile"
        )

@router.put("", response_model=schemas.UserResponse)
@limiter.limit("60/hour")
async def update_profile(
    request: Request,
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information.
    """
    try:
        update_data = user_update.dict(exclude_unset=True)
        
        # Remove password from update data (handled by separate endpoint)
        update_data.pop("password", None)
        
        # Update user fields
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        # Update timestamps
        current_user.updated_at = datetime.utcnow()
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        return current_user
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating profile"
        )

@router.post("/password")
@limiter.limit("10/hour")
async def change_password(
    request: Request,
    current_password: str,
    new_password: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.
    """
    try:
        # Verify current password
        if not current_user.check_password(current_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        current_user.set_password(new_password)
        current_user.updated_at = datetime.utcnow()
        
        db.add(current_user)
        db.commit()
        
        return {"status": "success", "message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error changing password"
        )

@router.post("/picture")
@limiter.limit("20/hour")
async def upload_profile_picture(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a new profile picture.
    
    Accepts image files (JPEG, PNG) up to 5MB.
    """
    try:
        # Generate a unique filename using user ID and timestamp
        filename = f"user_{current_user.id}_{int(datetime.utcnow().timestamp())}"
        
        # Save the file using the storage utility
        file_path, file_url = await storage.save_upload_file(
            file=file,
            subfolder="profile_pictures",
            filename=filename,
            allowed_types=["image/jpeg", "image/png", "image/jpg"],
            max_size=5 * 1024 * 1024  # 5MB
        )
        
        # If there was a previous profile picture, delete it
        if current_user.profile_picture_url:
            try:
                # Extract the relative path from the URL
                relative_path = "/".join(current_user.profile_picture_url.split("/")[2:])
                storage.delete_file(relative_path)
            except Exception as e:
                logger.warning(f"Failed to delete old profile picture: {str(e)}")
        
        # Update user's profile picture URL
        current_user.profile_picture_url = file_url
        current_user.updated_at = datetime.utcnow()
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        return {
            "status": "success",
            "message": "Profile picture uploaded successfully",
            "profile_picture_url": file_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading profile picture: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading profile picture"
        )
