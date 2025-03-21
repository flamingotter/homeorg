# app/routers/items.py
import logging
from fastapi import Depends, HTTPException, APIRouter, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
import json
from datetime import date, datetime

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

@router.get("/items/")
def read_root_items(db: Session = Depends(get_db)):
    items = db.query(models.Item).all()
    item_list = []
    for item in items:
        images = db.query(models.Image).filter(models.Image.item_id == item.id).all()
        item_data = item.__dict__
        item_data["images"] = [{"id": image.id, "filename": image.filename, "item_id": image.item_id, "folder_id": image.folder_id} for image in images]
        item_list.append(item_data)
        logging.info(f"Item Data: {item_data}")
    return item_list

@router.get("/items/{item_id}")
def read_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    item_dict = db_item.__dict__
    item_dict['folder_id'] = db_item.folder_id
    images = db.query(models.Image).filter(models.Image.item_id == item_id).all()
    item_dict["images"] = [image.__dict__ for image in images]
    return item_dict

@router.post("/items/")
def create_item(item: dict, db: Session = Depends(get_db)):
    acquired_date_str = item.get("acquired_date")
    acquired_date_obj = None
    if acquired_date_str:
        try:
            acquired_date_obj = datetime.strptime(acquired_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    db_item = models.Item(
        name=item["name"],
        description=item.get("description"),
        folder_id=item.get("folder_id"),
        quantity=item.get("quantity"),
        unit=item.get("unit"),
        tag=item.get("tag"),
        acquired_date=acquired_date_obj,
        notes=item.get("notes")
    ) # Removed image_url
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item.__dict__

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

@router.patch("/items/{item_id}", response_model=None)
def update_item(item_id: int, item: dict, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in item.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item.__dict__

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

@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an item and its associated images."""
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Delete associated images
    images = db.query(models.Image).filter(models.Image.item_id == item_id).all()
    for image in images:
        db.delete(image)

    # Delete the item
    db.delete(item)
    db.commit()

    return {"ok": True}