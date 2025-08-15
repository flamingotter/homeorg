from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status, Response, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import shutil

from app.db.session import get_db
from app.crud import item as crud_item
from app.crud import image as crud_image
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate
from app.schemas.image import ImageCreate, ImageResponse

router = APIRouter()

IMAGE_DIR = "static/images"
os.makedirs(IMAGE_DIR, exist_ok=True)

class ItemClone(BaseModel):
    new_folder_id: Optional[int] = None

class ItemMove(BaseModel):
    new_folder_id: Optional[int] = None

@router.get("/", response_model=List[ItemResponse])
def read_all_items(db: Session = Depends(get_db)):
    return crud_item.get_items(db)

@router.get("/{item_id}", response_model=ItemResponse)
def read_item(item_id: int, db: Session = Depends(get_db)):
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.post("/{item_id}/images/", response_model=ImageResponse, summary="Upload an image for an item")
async def upload_image_for_item(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    filename = os.path.basename(file.filename)
    file_location = os.path.join(IMAGE_DIR, filename)

    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {e}")

    image_create_data = ImageCreate(
        filename=filename,
        filepath=f"/static_images/{filename}",
        description=f"Image for item {db_item.name}",
        item_id=item_id,
        folder_id=None
    )
    db_image = crud_image.create_image(db=db, image=image_create_data)

    return db_image

@router.post("/", response_model=ItemResponse)
async def create_item(
    db: Session = Depends(get_db),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    quantity: Optional[float] = Form(1.0),
    unit: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    acquired_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    folder_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    item_schema = ItemCreate(
        name=name, 
        description=description, 
        quantity=quantity, 
        unit=unit, 
        tags=tags, 
        acquired_date=acquired_date, 
        notes=notes, 
        folder_id=folder_id
    )
    db_item = crud_item.create_item(db=db, item=item_schema)

    if image and image.filename:
        filename = os.path.basename(image.filename)
        file_location = os.path.join(IMAGE_DIR, filename)
        try:
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_schema = ImageCreate(
                filename=filename,
                filepath=f"/static_images/{filename}",
                description=f"Image for item {db_item.name}",
                item_id=db_item.id
            )
            crud_image.create_image(db=db, image=image_schema)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Item created, but failed to upload image: {e}")

    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    db: Session = Depends(get_db),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    quantity: Optional[float] = Form(1.0),
    unit: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    acquired_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    folder_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    db_item = crud_item.get_item(db, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    item_update_schema = ItemUpdate(
        name=name,
        description=description,
        quantity=quantity,
        unit=unit,
        tags=tags,
        acquired_date=acquired_date,
        notes=notes,
        folder_id=folder_id
    )
    
    updated_item = crud_item.update_item(db=db, item_id=item_id, item=item_update_schema)

    if image and image.filename:
        filename = os.path.basename(image.filename)
        file_location = os.path.join(IMAGE_DIR, filename)
        try:
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_schema = ImageCreate(
                filename=filename,
                filepath=f"/static_images/{filename}",
                description=f"Image for item {updated_item.name}",
                item_id=updated_item.id
            )
            crud_image.create_image(db=db, image=image_schema)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Item updated, but failed to upload new image: {e}")

    db.refresh(updated_item)
    return updated_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    crud_item.delete_item(db=db, item_id=item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{item_id}/clone", response_model=ItemResponse)
def clone_item(item_id: int, clone_data: ItemClone, db: Session = Depends(get_db)):
    """
    Clone an existing item. Optionally, place the clone in a different folder.
    """
    cloned_item = crud_item.clone_item(db=db, item_id=item_id, new_folder_id=clone_data.new_folder_id)
    if cloned_item is None:
        raise HTTPException(status_code=404, detail="Item not found or target folder invalid")
    db.commit()
    db.refresh(cloned_item)
    return cloned_item

@router.put("/{item_id}/move", response_model=ItemResponse)
def move_item(item_id: int, move_data: ItemMove, db: Session = Depends(get_db)):
    """
    Move an item to a different folder. Set new_folder_id to None to move to the root.
    """
    db_item = crud_item.move_item(db=db, item_id=item_id, new_folder_id=move_data.new_folder_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found or target folder invalid")
    return db_item
