from typing import List, Optional
from fastapi import Depends, HTTPException, APIRouter # type: ignore
from sqlalchemy import func # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app import models
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

@router.post("/folders/", response_model=None)
def create_folder(folder: dict, db: Session = Depends(get_db)):
    existing_folder = db.query(models.Folder).filter(models.Folder.name == folder["name"], models.Folder.parent_id == folder.get("parent_id")).first()
    if existing_folder:
        raise HTTPException(status_code=400, detail="Folder already exists")

    db_folder = models.Folder(name=folder["name"], parent_id=folder.get("parent_id"), description=folder.get("description"), notes=folder.get("notes"), tags=folder.get("tags")) # Remove image_url here
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder.__dict__

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

@router.get("/folders/")
def read_root_folders(db: Session = Depends(get_db)):
    folders = db.query(models.Folder).filter(models.Folder.parent_id == None).all()
    total_quantity = calculate_folder_quantity(db, None)
    folder_list = []
    for folder in folders:
        folder_data = folder.__dict__
        images = db.query(models.Image).filter(models.Image.folder_id == folder.id).all()
        folder_data["images"] = [image.__dict__ for image in images]
        folder_list.append(folder_data)
    return {"folders": folder_list, "total_quantity": total_quantity}

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

@router.patch("/folders/{folder_id}", response_model=None)
def update_folder(folder_id: int, folder: dict, db: Session = Depends(get_db)):
    db_folder = get_folder_by_id(db, folder_id)
    for key, value in folder.items():
        setattr(db_folder, key, value)
    db.commit()
    db.refresh(db_folder)
    return db_folder.__dict__

@router.get("/folders/{folder_id}/quantity")
def get_folder_quantity(folder_id: int, db: Session = Depends(get_db)):
    total_quantity = calculate_folder_quantity(db, folder_id)
    return {"quantity": total_quantity}

@router.get("/folders/{folder_id}")
def read_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = get_folder_by_id(db, folder_id)
    folder_data = folder.__dict__
    images = db.query(models.Image).filter(models.Image.folder_id == folder_id).all()
    folder_data["images"] = [image.__dict__ for image in images]
    return folder_data

@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    """Delete a folder by its ID."""
    folder = get_folder_by_id(db, folder_id)

    # Recursively find and delete all child folders and their items
    def delete_recursive(db: Session, current_folder_id: int):
        child_folders = db.query(models.Folder).filter(models.Folder.parent_id == current_folder_id).all()
        for child_folder in child_folders:
            delete_recursive(db, child_folder.id)
            # Delete items within the child folder
            db.query(models.Item).filter(models.Item.folder_id == child_folder.id).delete(synchronize_session=False)
            db.delete(child_folder)

        # Delete items directly within the current folder
        db.query(models.Item).filter(models.Item.folder_id == current_folder_id).delete(synchronize_session=False)
        db.delete(folder) # Delete the current folder after its children

    delete_recursive(db, folder_id)

    # If the folder has no children, we can delete it directly
    # db.query(models.Item).filter(models.Item.folder_id == folder_id).delete(synchronize_session=False)
    # db.delete(folder)

    db.commit()
    return None

def clone_folder_recursive(db: Session, original_folder: models.Folder, parent_id: Optional[int] = None) -> models.Folder:
    db_folder = models.Folder(
        name=f"Clone of {original_folder.name}",
        parent_id=parent_id,
        description=original_folder.description,
        notes=original_folder.notes,
        tags=original_folder.tags,
    ) #Removed image_url
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)

    original_items = db.query(models.Item).filter(models.Item.folder_id == original_folder.id).all()
    for item in original_items:
        db_item = models.Item(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            folder_id=db_folder.id,
            description=item.description,
            notes=item.notes,
            tags=item.tags,
            date_acquired=item.date_acquired
        ) # Removed image_url
        db.add(db_item)
        db.commit()
        db.refresh(db_item)

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