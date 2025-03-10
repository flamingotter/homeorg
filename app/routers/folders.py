# /app/routers/folders.py
from typing import List
from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
import json
import logging

router = APIRouter()
logging.basicConfig(level=logging.INFO)

@router.post("/folders/", response_model=None)
def create_folder(folder: dict, db: Session = Depends(get_db)):
    existing_folder = db.query(models.Folder).filter(
        models.Folder.name == folder["name"],
        models.Folder.parent_id == folder.get("parent_id")
    ).first()

    if existing_folder:
        raise HTTPException(status_code=400, detail="Folder already exists")

    db_folder = models.Folder(
        name=folder["name"],
        parent_id=folder.get("parent_id"),
        description=folder.get("description"),
        notes=folder.get("notes"),
        tags=folder.get("tags")
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)

    logging.info(f"Serialized db_folder: {json.dumps(db_folder.__dict__, default=str)}")
    return db_folder.__dict__

@router.get("/folders/count")
def get_root_folder_count(db: Session = Depends(get_db)):
    """
    Retrieve the total count of root folders.
    """
    count = db.query(func.count(models.Folder.id)).filter(models.Folder.parent_id == None).scalar()
    return count if count is not None else 0

@router.get("/folders/{folder_id}/count")
def get_folder_child_count(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve the total count of child folders within a specific folder.
    """
    count = db.query(func.count(models.Folder.id)).filter(models.Folder.parent_id == folder_id).scalar()
    return count if count is not None else 0

@router.get("/folders/{folder_id}/parent")
def get_parent_folder(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve the parent folder of a specific folder.
    """
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder.parent_id is None:
        return None  # Indicate no parent (root folder)

    parent_folder = db.query(models.Folder).filter(models.Folder.id == folder.parent_id).first()
    if parent_folder is None:
        raise HTTPException(status_code=404, detail="Parent folder not found")

    return parent_folder.__dict__

@router.get("/folders/")
def read_root_folders(db: Session = Depends(get_db)):
    """
    Retrieve only root folders (folders with parent_id = None).
    """
    folders = db.query(models.Folder).filter(models.Folder.parent_id == None).all()
    return [folder.__dict__ for folder in folders]

@router.get("/folders/{folder_id}/folders")
def read_sub_folders(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve sub-folders of a specific folder.
    """
    folders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
    return [folder.__dict__ for folder in folders]

@router.get("/folders/{folder_id}/items")
def read_folder_items(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve items within a specific folder.
    """
    items = db.query(models.Item).filter(models.Item.folder_id == folder_id).all()
    return [item.__dict__ for item in items]

# /app/routers/items.py
from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
import logging

router = APIRouter()
logging.basicConfig(level=logging.INFO)

@router.post("/items/")
def create_item(item: dict, db: Session = Depends(get_db)):
    existing_item = db.query(models.Item).filter(
        models.Item.name == item["name"],
        models.Item.folder_id == item.get("folder_id")
    ).first()

    if existing_item:
        raise HTTPException(status_code=400, detail="Item already exists in this folder")

    db_item = models.Item(
        name=item["name"],
        description=item.get("description"),
        folder_id=item.get("folder_id"),
        quantity=item.get("quantity"),
        unit=item.get("unit"),
        tags=item.get("tags")
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item.__dict__

@router.get("/items/count")
def get_root_item_count(db: Session = Depends(get_db)):
    """
    Retrieve the total count of root items.
    """
    count = db.query(func.count(models.Item.id)).filter(models.Item.folder_id == None).scalar()
    return count if count is not None else 0

@router.get("/items/quantity")
def get_root_item_quantity(db: Session = Depends(get_db)):
    """
    Retrieve the total quantity of root items.
    """
    quantity = db.query(func.sum(models.Item.quantity)).filter(models.Item.folder_id == None).scalar()
    return quantity if quantity is not None else 0

@router.get("/items/")
def read_root_items(db: Session = Depends(get_db)):
    """
    Retrieve only root items (items with folder_id = None).
    """
    items = db.query(models.Item).filter(models.Item.folder_id == None).all()
    return [item.__dict__ for item in items]

@router.get("/items/{item_id}")
def read_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    item_dict = db_item.__dict__
    item_dict['folder_id'] = db_item.folder_id #Add the folder ID to the dictionary.
    return item_dict

@router.get("/folders/{folder_id}/items/count")
def get_folder_item_count(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve the total count of items within a specific folder.
    """
    count = db.query(func.count(models.Item.id)).filter(models.Item.folder_id == folder_id).scalar()
    return count if count is not None else 0

@router.get("/folders/{folder_id}/items/quantity")
def get_folder_item_quantity(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve the total quantity of items within a specific folder.
    """
    quantity = db.query(func.sum(models.Item.quantity)).filter(models.Item.folder_id == folder_id).scalar()
    return quantity if quantity is not None else 0