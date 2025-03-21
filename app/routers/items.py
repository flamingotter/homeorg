# app/routers/items.py
import logging
from fastapi import Depends, HTTPException, APIRouter, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
import json
from datetime import date, datetime
from typing import Optional

router = APIRouter()
logging.basicConfig(level=logging.INFO)

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

@router.get("/items/", response_model=list[schemas.Item])
def read_root_items(db: Session = Depends(get_db)):
    items = db.query(models.Item).all()
    return items

@router.get("/items/{item_id}", response_model=schemas.Item)
def read_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.post("/items/", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    """Create a new item."""
    db_item = models.Item(**item.dict())
    try:
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()

@router.post("/items/{item_id}/images/")
async def upload_image(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    file_path = f"/app/static/images/{file.filename}"
    logging.info(f"Attempting to save file to: {file_path}")

    try:
        with open(file_path, "wb") as image_file:
            image_data = await file.read()
            logging.info(f"File size: {len(image_data)} bytes")
            image_file.write(image_data)

        db_image = models.Image(filename=file.filename, item_id=item_id)
        db.add(db_image)
        db.commit()
        db.refresh(db_image)

        return db_image.__dict__

    except Exception as e:
        logging.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving file: {e}")

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

@router.patch("/items/{item_id}", response_model=schemas.Item)
def update_item(item_id: int, item: schemas.ItemUpdate, db: Session = Depends(get_db)):
    """Update an existing item."""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)

    try:
        db.commit()
        db.refresh(db_item)
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()

@router.post("/items/{item_id}/clone") 
def clone_item(item_id: int, db: Session = Depends(get_db)):
    """Clone an item and its associated images."""
    original_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not original_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Create a new item with the same data
    db_item = models.Item(
        name=f"Clone of {original_item.name}",
        folder_id=original_item.folder_id,
        quantity=original_item.quantity,
        unit=original_item.unit,
        description=original_item.description,
        notes=original_item.notes,
        tags=original_item.tags,
        acquired_date=original_item.acquired_date
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # Clone associated images
    original_images = db.query(models.Image).filter(models.Image.item_id == original_item.id).all()
    for image in original_images:
        db_image = models.Image(
            filename=image.filename,
            item_id=db_item.id,
            folder_id=image.folder_id
        )
        db.add(db_image)
    db.commit()

    return db_item

@router.delete("/items/{item_id}", response_model=schemas.Item)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an item by ID."""
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        db.delete(db_item)
        db.commit()
        return db_item
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()

@router.put("/items/{item_id}/move")
def move_item(item_id: int, destination_folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Move an item to a new folder or the root level."""
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.folder_id = destination_folder_id  # Update folder_id
    db.commit()

    return {"message": "Item moved successfully"}