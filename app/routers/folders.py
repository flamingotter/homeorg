from typing import List, Optional
from fastapi import Depends, HTTPException, APIRouter # type: ignore
from sqlalchemy import func # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app import models, schemas
from app.database import get_db
import logging

router = APIRouter()
logging.basicConfig(level=logging.INFO)

def get_folder_by_id(db: Session, folder_id: int) -> models.Folder:
    """Helper function to retrieve a folder by ID."""
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    return folder

def calculate_folder_quantity(db: Session, folder_id: Optional[int]) -> int:
    """Recursively calculates the total quantity of items within a folder and its children."""
    total_quantity = 0

    if folder_id is None:
        # Include items with null folder_id (root level items)
        root_items_quantity = db.query(func.sum(models.Item.quantity)).filter(models.Item.folder_id == None).scalar()
        total_quantity += root_items_quantity if root_items_quantity else 0

        # Get root folders and calculate their quantities
        root_folders = db.query(models.Folder).filter(models.Folder.parent_id == None).all()
        for root_folder in root_folders:
            total_quantity += calculate_folder_quantity(db, root_folder.id)
    else:
        # Get items directly in the folder
        items_quantity = db.query(func.sum(models.Item.quantity)).filter(models.Item.folder_id == folder_id).scalar()
        total_quantity += items_quantity if items_quantity else 0

        # Get child folders and calculate their quantities
        child_folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
        for child_folder in child_folders:
            total_quantity += calculate_folder_quantity(db, child_folder.id)

    return total_quantity

@router.post("/folders/", response_model=schemas.Folder)
def create_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db)):
    """Create a new folder."""
    db_folder = models.Folder(**folder.dict())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder


@router.get("/folders/count")
def get_root_folder_count(db: Session = Depends(get_db)):
    count = db.query(func.count(models.Folder.id)).filter(models.Folder.parent_id == None).scalar()
    return count if count is not None else 0

@router.get("/folders/{folder_id}/count")
def get_folder_child_count(folder_id: int, db: Session = Depends(get_db)):
    count = db.query(func.count(models.Folder.id)).filter(models.Folder.parent_id == folder_id).scalar()
    return count if count is not None else 0

@router.get("/folders/{folder_id}/parent")
def get_parent_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = get_folder_by_id(db, folder_id)
    if folder.parent_id is None:
        return None
    parent_folder = get_folder_by_id(db, folder.parent_id)
    return parent_folder.__dict__

@router.get("/folders/", response_model=list[schemas.Folder])
def read_folders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Read all folders."""
    return db.query(models.Folder).offset(skip).limit(limit).all()

@router.get("/folders/{folder_id}/folders")
def read_sub_folders(folder_id: int, db: Session = Depends(get_db)):
    folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
    folder_list = []
    for folder in folders:
        folder_data = folder.__dict__
        images = db.query(models.Image).filter(models.Image.folder_id == folder.id).all()
        folder_data["images"] = [image.__dict__ for image in images]
        folder_list.append(folder_data)
    return folder_list

@router.get("/folders/{folder_id}/items")
def read_folder_items(folder_id: int, db: Session = Depends(get_db)):
    items = db.query(models.Item).filter(models.Item.folder_id == folder_id).all()
    item_list = []
    for item in items:
        item_data = item.__dict__
        images = db.query(models.Image).filter(models.Image.item_id == item.id).all()
        item_data["images"] = [image.__dict__ for image in images]
        item_list.append(item_data)
    return item_list

@router.patch("/folders/{folder_id}", response_model=schemas.Folder)
def update_folder(folder_id: int, folder: schemas.FolderUpdate, db: Session = Depends(get_db)):
    """Update an existing folder."""
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    for key, value in folder.dict(exclude_unset=True).items():
        setattr(db_folder, key, value)
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.get("/folders/{folder_id}/quantity")
def get_folder_quantity(folder_id: int, db: Session = Depends(get_db)):
    total_quantity = calculate_folder_quantity(db, folder_id)
    return {"quantity": total_quantity}

@router.get("/folders/{folder_id}", response_model=schemas.Folder)
def read_folder(folder_id: int, db: Session = Depends(get_db)):
    """Read a folder by ID."""
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return db_folder


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    """Delete a folder and its contents, including images."""
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Delete associated item images
    items = db.query(models.Item).filter(models.Item.folder_id == folder_id).all()
    for item in items:
        db.query(models.Image).filter(models.Image.item_id == item.id).delete()

    # Delete associated folder images
    db.query(models.Image).filter(models.Image.folder_id == folder_id).delete()

    # Delete items in the folder
    db.query(models.Item).filter(models.Item.folder_id == folder_id).delete()

    # Recursively delete child folders
    child_folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
    for child_folder in child_folders:
        delete_folder(child_folder.id, db)  # Recursive call

    # Delete the folder itself
    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted successfully"}

def clone_folder_recursive(db: Session, original_folder: models.Folder, parent_id: Optional[int] = None) -> models.Folder:
    db_folder = models.Folder(
        name=f"Clone of {original_folder.name}",
        parent_id=parent_id,
        description=original_folder.description,
        notes=original_folder.notes,
        tags=original_folder.tags,
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)

    # Clone folder images
    original_folder_images = db.query(models.Image).filter(models.Image.folder_id == original_folder.id).all()
    for image in original_folder_images:
        db_image = models.Image(
            filename=image.filename,
            folder_id=db_folder.id
        )
        db.add(db_image)
    db.commit()

    original_items = db.query(models.Item).filter(models.Item.folder_id == original_folder.id).all()
    for item in original_items:
        db_item = models.Item(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            folder_id=db_folder.id,
            description=item.description,
            notes=item.notes,
            tags=item.tags
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        # Clone item images
        original_item_images = db.query(models.Image).filter(models.Image.item_id == item.id).all()
        for item_image in original_item_images:
            db_item_image = models.Image(
                filename=item_image.filename,
                item_id=db_item.id
            )
            db.add(db_item_image)
        db.commit()

    original_child_folders = db.query(models.Folder).filter(models.Folder.parent_id == original_folder.id).all()
    for child_folder in original_child_folders:
        clone_folder_recursive(db, child_folder, parent_id=db_folder.id)

    return db_folder

@router.post("/folders/{folder_id}/clone", response_model=None)
def clone_folder(folder_id: int, db: Session = Depends(get_db)):
    """Clone a folder and its contents."""
    original_folder = get_folder_by_id(db, folder_id)
    new_folder = clone_folder_recursive(db, original_folder, parent_id=original_folder.parent_id)
    return {"new_folder_id": new_folder.id}

@router.put("/folders/{folder_id}/move")
def move_folder(folder_id: int, destination_folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Move a folder and its contents (including child folders, items, and images) to a new parent folder or the root level."""
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    def recursive_move(folder_to_move: models.Folder, new_parent_id: Optional[int]):
        """Recursively move a folder and its contents."""
        folder_to_move.parent_id = new_parent_id
        db.commit()

        # Update items in the folder
        items = db.query(models.Item).filter(models.Item.folder_id == folder_to_move.id).all()
        for item in items:
            item.folder_id = folder_to_move.id
            db.commit()

        # Recursively move child folders
        child_folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_to_move.id).all()
        for child_folder in child_folders:
            recursive_move(child_folder, folder_to_move.id)

    recursive_move(folder, destination_folder_id)

    return {"message": "Folder and its contents moved successfully"}