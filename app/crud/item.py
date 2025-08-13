# app/crud/item.py
# Contains CRUD operations for the Item model.

from __future__ import annotations # MUST be the very first import

from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

# Import models and schemas from the top-level 'app' package
from app import models, schemas

def create_item(db: Session, item: schemas.ItemCreate) -> models.Item: # Direct type hint
    """
    Creates a new item in the database.
    """
    item_data = item.model_dump()
    
    db_item = models.Item(**item_data) # Use models.Item
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_item(db: Session, item_id: int) -> Optional[models.Item]:
    """
    Retrieves a single item by its ID.
    Eagerly loads images associated with the item.
    """
    return db.query(models.Item).options( # Use models.Item
        joinedload(models.Item.images) # Use models.Item.images
    ).filter(models.Item.id == item_id).first() # Use models.Item.id

def get_items(db: Session, skip: int = 0, limit: int = 100, folder_id: Optional[int] = None) -> List[models.Item]:
    """
    Retrieves a list of items, optionally filtered by folder_id.
    Eagerly loads images for each item.
    """
    query = db.query(models.Item).options( # Use models.Item
        joinedload(models.Item.images) # Use models.Item.images
    )
    if folder_id is not None:
        query = query.filter(models.Item.folder_id == folder_id) # Use models.Item.folder_id
    return query.offset(skip).limit(limit).all()

def update_item(db: Session, item_id: int, item: schemas.ItemUpdate) -> Optional[models.Item]: # Direct type hint
    """
    Updates an existing item in the database.
    """
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first() # Use models.Item
    if db_item:
        update_data = item.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_item, key, value)
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_item(db: Session, item_id: int) -> Optional[models.Item]:
    """
    Deletes an item from the database.
    Associated images will be deleted due to cascade="all, delete-orphan" in models.py.
    """
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first() # Use models.Item
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

def clone_item(db: Session, item_id: int, new_folder_id: Optional[int] = None) -> Optional[models.Item]:
    """
    Clones an item with all its attributes and associated images.
    Does not commit the transaction.
    """
    original_item = get_item(db, item_id)
    if not original_item:
        return None

    # Create a new item with the same attributes, appending " (Cloned)" to the name
    new_item_data = {
        "name": f"{original_item.name} (Cloned)",
        "description": original_item.description,
        "quantity": original_item.quantity,
        "unit": original_item.unit,
        "notes": original_item.notes,
        "tags": original_item.tags,
        "folder_id": new_folder_id if new_folder_id is not None else original_item.folder_id,
    }
    
    new_item = models.Item(**new_item_data)
    db.add(new_item)
    db.flush()

    # Clone associated images
    for original_image in original_item.images:
        new_image_data = {
            "filename": original_image.filename,
            "filepath": original_image.filepath,
            "description": original_image.description,
            "item_id": new_item.id,
        }
        db.add(models.Image(**new_image_data))

    return new_item

def move_item(db: Session, item_id: int, new_folder_id: Optional[int]) -> Optional[models.Item]:
    """
    Moves an item to a different folder.
    Set new_folder_id to None to move to the root.
    """
    db_item = get_item(db, item_id)
    if not db_item:
        return None

    # Check if new_folder_id exists if it's not None
    if new_folder_id is not None:
        # Import get_folder locally to avoid circular dependency at module load time
        # This is a special case for cross-CRUD calls
        from app.crud.folder import get_folder
        target_folder = get_folder(db, new_folder_id)
        if not target_folder:
            return None # Target folder does not exist
    
    db_item.folder_id = new_folder_id
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
