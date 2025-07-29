# app/crud/image.py
# Contains CRUD operations for the Image model.

from __future__ import annotations # MUST be the very first import

from sqlalchemy.orm import Session
from typing import List, Optional

# Import models and schemas from the top-level 'app' package
from app import models, schemas

def create_image(db: Session, image: schemas.ImageCreate) -> models.Image:
    """
    Creates a new image record in the database.
    """
    db_image = models.Image(**image.model_dump()) # Use models.Image
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_image(db: Session, image_id: int) -> Optional[models.Image]:
    """
    Retrieves a single image by its ID.
    """
    return db.query(models.Image).filter(models.Image.id == image_id).first() # Use models.Image

def get_images(db: Session, skip: int = 0, limit: int = 100, item_id: Optional[int] = None, folder_id: Optional[int] = None) -> List[models.Image]:
    """
    Retrieves a list of images, optionally filtered by item_id or folder_id.
    """
    query = db.query(models.Image) # Use models.Image
    if item_id is not None:
        query = query.filter(models.Image.item_id == item_id) # Use models.Image.item_id
    if folder_id is not None:
        query = query.filter(models.Image.folder_id == folder_id) # Use models.Image.folder_id
    return query.offset(skip).limit(limit).all()

def update_image(db: Session, image_id: int, image: schemas.ImageUpdate) -> Optional[models.Image]:
    """
    Updates an existing image record in the database.
    """
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first() # Use models.Image
    if db_image:
        update_data = image.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_image, key, value)
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
    return db_image

def delete_image(db: Session, image_id: int) -> Optional[models.Image]:
    """
    Deletes an image record from the database.
    """
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first() # Use models.Image
    if db_image:
        db.delete(db_image)
        db.commit()
    return db_image
