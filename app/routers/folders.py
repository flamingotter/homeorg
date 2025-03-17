from typing import List, Optional
from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy import func
from sqlalchemy.orm import Session
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

    db_folder = models.Folder(name=folder["name"], parent_id=folder.get("parent_id"), description=folder.get("description"), notes=folder.get("notes"), tags=folder.get("tags"))
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
    return {"folders": [folder.__dict__ for folder in folders], "total_quantity": total_quantity}

@router.get("/folders/{folder_id}/folders")
def read_sub_folders(folder_id: int, db: Session = Depends(get_db)):
    folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
    return [folder.__dict__ for folder in folders]

@router.get("/folders/{folder_id}/items")
def read_folder_items(folder_id: int, db: Session = Depends(get_db)):
    items = db.query(models.Item).filter(models.Item.folder_id == folder_id).all()
    return [item.__dict__ for item in items]

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
    """Retrieve a specific folder by ID."""
    folder = get_folder_by_id(db, folder_id)
    return folder.__dict__