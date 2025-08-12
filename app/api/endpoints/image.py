# app/api/endpoints/image.py
# FastAPI router for Image operations, now with file upload support.
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil

# Import specific crud functions and schemas directly
from app.crud.image import (
    create_image, get_image, get_images, update_image, delete_image
)
from app.schemas.image import ImageCreate, ImageUpdate, ImageResponse
from app.db.session import get_db

router = APIRouter(
    tags=["Images"],
)

# Define the directory where images will be stored.
# This must match the directory mounted in main.py
IMAGE_DIR = "static/images"
os.makedirs(IMAGE_DIR, exist_ok=True)





@router.post("/", response_model=ImageResponse, status_code=status.HTTP_201_CREATED, summary="Create a new image record")
def create_new_image(image: ImageCreate, db: Session = Depends(get_db)):
    """
    Create a new image record in the database.
    Note: This endpoint only creates the database record, not the file itself.
    """
    if image.item_id is not None and image.folder_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image cannot be linked to both an item and a folder."
        )
    if image.item_id is None and image.folder_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be linked to either an item or a folder."
        )

    db_image = create_image(db=db, image=image)
    return db_image

@router.get("/{image_id}", response_model=ImageResponse, summary="Get an image by ID")
def read_image(image_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single image record by its unique ID.
    """
    db_image = get_image(db=db, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return db_image

@router.get("/", response_model=List[ImageResponse], summary="Get all images or filter by item/folder")
def read_images(
    skip: int = 0,
    limit: int = 100,
    item_id: Optional[int] = None,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieve a list of all image records, with optional pagination and filtering
    by associated item ID or folder ID.
    """
    if item_id is not None and folder_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot filter images by both item_id and folder_id simultaneously."
        )
    
    images = get_images(db=db, skip=skip, limit=limit, item_id=item_id, folder_id=folder_id)
    if not images:
        return []
        
    return images

@router.put("/{image_id}", response_model=ImageResponse, summary="Update an image by ID")
def update_existing_image(image_id: int, image: ImageUpdate, db: Session = Depends(get_db)):
    """
    Update an existing image record's details by its ID.
    """
    if image.item_id is not None and image.folder_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image cannot be linked to both an item and a folder."
        )

    db_image = update_image(db=db, image_id=image_id, image=image)
    if db_image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return db_image

@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an image by ID")
def delete_existing_image(image_id: int, db: Session = Depends(get_db)):
    """
    Delete an image record by its ID.
    """
    db_image = delete_image(db=db, image_id=image_id)
    if db_image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return {"message": "Image deleted successfully"}
