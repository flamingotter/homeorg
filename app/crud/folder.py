# app/crud/folder.py
# Contains CRUD operations for the Folder model.

from __future__ import annotations # MUST be the very first import

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

# Import models and schemas from the top-level 'app' package
from app import models, schemas


# --- Folder CRUD Operations ---

def create_folder(db: Session, folder: schemas.FolderCreate) -> models.Folder:
    """
    Creates a new folder in the database.
    """
    folder_data = folder.model_dump()
    
    db_folder = models.Folder(**folder_data) # Use models.Folder
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def get_folder(db: Session, folder_id: int) -> Optional[models.Folder]:
    """
    Retrieves a single folder by its ID, eagerly loading its items, subfolders, and images.
    """
    return db.query(models.Folder).options( # Use models.Folder
        joinedload(models.Folder.items).joinedload(models.Item.images), # Use models.Folder.items, models.Item.images
        joinedload(models.Folder.subfolders), # Use models.Folder.subfolders
        joinedload(models.Folder.images) # Use models.Folder.images
    ).filter(models.Folder.id == folder_id).first() # Use models.Folder.id

def get_root_folders(db: Session, skip: int = 0, limit: int = 100) -> List[models.Folder]:
    """
    Retrieves all root-level folders (folders with parent_id is NULL).
    Eagerly loads their items, subfolders, and images.
    """
    return db.query(models.Folder).options( # Use models.Folder
        joinedload(models.Folder.items).joinedload(models.Item.images), # Use models.Folder.items, models.Item.images
        joinedload(models.Folder.subfolders), # Use models.Folder.subfolders
        joinedload(models.Folder.images) # Use models.Folder.images
    ).filter(models.Folder.parent_id == None).offset(skip).limit(limit).all() # Use models.Folder.parent_id


def get_all_folders(db: Session, skip: int = 0, limit: int = 100) -> List[models.Folder]:
    """
    Retrieves all folders in the database.
    """
    return db.query(models.Folder).offset(skip).limit(limit).all() # Use models.Folder

def update_folder(db: Session, folder_id: int, folder: schemas.FolderUpdate) -> Optional[models.Folder]:
    """
    Updates an existing folder in the database.
    """
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first() # Use models.Folder
    if db_folder:
        update_data = folder.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_folder, key, value)
        db.add(db_folder)
        db.commit()
        db.refresh(db_folder)
    return db_folder

def delete_folder(db: Session, folder_id: int) -> Optional[models.Folder]:
    """
    Deletes a folder and all its contents (subfolders, items, and images) recursively.
    This relies on the 'ondelete="CASCADE"' and 'cascade="all, delete-orphan"'
    settings in models.py relationships.
    """
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first() # Use models.Folder
    if db_folder:
        db.delete(db_folder)
        db.commit()
    return db_folder

def clone_folder(db: Session, folder_id: int, new_parent_id: Optional[int] = None) -> Optional[models.Folder]:
    """
    Clones a folder, including all its subfolders, items, and images recursively.
    """
    original_folder = get_folder(db, folder_id)
    if not original_folder:
        return None

    # Helper function for recursive cloning
    def _recursive_clone(original_f: models.Folder, parent_id: Optional[int]) -> models.Folder:
        # Clone the folder itself
        new_folder_data = {
            "name": f"{original_f.name} (Cloned)",
            "description": original_f.description,
            "notes": original_f.notes,
            "tags": original_f.tags,
            "parent_id": parent_id if parent_id is not None else original_f.parent_id,
        }
        print(f"DEBUG: _recursive_clone - new_folder_data: {new_folder_data}")
        print(f"DEBUG: _recursive_clone - parent_id received: {parent_id}")

        new_folder = models.Folder(**new_folder_data)
        db.add(new_folder)
        db.flush() # Flush to get the new_folder.id before committing
        print(f"DEBUG: _recursive_clone - new_folder created with ID: {new_folder.id}, parent_id: {new_folder.parent_id}")

        # Clone items within this folder
        from app.crud.item import clone_item
        for original_item in original_f.items:
            clone_item(db, original_item.id, new_folder.id)

        # Clone images associated with this folder
        for original_folder_image in original_f.images:
            new_image_data = {
                "filename": original_folder_image.filename,
                "filepath": original_folder_image.filepath,
                "description": original_folder_image.description,
                "folder_id": new_folder.id,
            }
            db.add(models.Image(**new_image_data))

        # Recursively clone subfolders
        for original_subfolder in original_f.subfolders:
            _recursive_clone(original_subfolder, new_folder.id)

        return new_folder

    # Start the recursive cloning process
    cloned_folder = _recursive_clone(original_folder, new_parent_id)
    db.commit()
    db.refresh(cloned_folder)
    return cloned_folder

def move_folder(db: Session, folder_id: int, new_parent_id: Optional[int]) -> Optional[models.Folder]:
    """
    Moves a folder to a different parent folder.
    Set new_parent_id to None to move to the root.
    Prevents moving a folder into itself or its subfolders.
    """
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None

    # Prevent moving a folder into itself
    if new_parent_id == folder_id:
        return None

    # Prevent moving a folder into one of its own subfolders
    if new_parent_id is not None:
        current_check_folder_id = new_parent_id
        while current_check_folder_id is not None:
            if current_check_folder_id == folder_id:
                return None # Trying to move into a subfolder of itself
            parent_of_check = db.query(models.Folder.parent_id).filter(models.Folder.id == current_check_folder_id).scalar() # Use models.Folder
            current_check_folder_id = parent_of_check

    db_folder.parent_id = new_parent_id
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

# NEW: Function to calculate total quantity in a folder and its subfolders
def calculate_folder_quantity(db: Session, folder_id: Optional[int]) -> float:
    """Recursively calculates the total quantity of items within a folder and its children."""
    total_quantity = 0.0

    if folder_id is None:
        # Include items with null folder_id (root level items)
        root_items_quantity = db.query(func.sum(models.Item.quantity)).filter(models.Item.folder_id == None).scalar() # Use models.Item
        total_quantity += root_items_quantity if root_items_quantity else 0.0

        # Get root folders and calculate their quantities
        root_folders = db.query(models.Folder).filter(models.Folder.parent_id == None).all() # Use models.Folder
        for root_folder in root_folders:
            total_quantity += calculate_folder_quantity(db, root_folder.id)
    else:
        # Get items directly in the folder
        items_quantity = db.query(func.sum(models.Item.quantity)).filter(models.Item.folder_id == folder_id).scalar() # Use models.Item
        total_quantity += items_quantity if items_quantity else 0.0

        # Get child folders and calculate their quantities
        child_folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all() # Use models.Folder
        for child_folder in child_folders:
            total_quantity += calculate_folder_quantity(db, child_folder.id)

    return total_quantity