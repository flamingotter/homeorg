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
    )
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