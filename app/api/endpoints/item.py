# app/api/endpoints/item.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status, Response, status, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import item as crud_item
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate

# Import image crud and router to handle image association
from app.crud import image as crud_image
from app.schemas.image import ImageResponse

from app.api.endpoints import image as image_router
from app.api.endpoints import counts as counts_router

router = APIRouter()

# New endpoint to get all items
@router.get("/", response_model=List[ItemResponse])
def read_all_items(db: Session = Depends(get_db)):
    """
    Retrieve all items from the database.
    
    This endpoint uses the get_items function from the crud layer,
    which retrieves all items by default with a limit of 100.
    """
    # Use the existing get_items function from the crud module
    return crud_item.get_items(db)

@router.get("/{item_id}", response_model=ItemResponse)
def read_item(item_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific item by its ID.
    """
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.post("/{item_id}/add_image", response_model=ImageResponse)
def add_image_to_item(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Adds an image to a specific item.
    """
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Save the image file and get the path
    image_url = crud_image.save_image(file)
    
    # Create the Image entry in the database, associating it with the item
    image_create_data = {"filename": file.filename, "url": image_url, "item_id": item_id}
    db_image = crud_image.create_image_for_item(db, item_id=item_id, image_data=image_create_data)
    
    return db_image

# Endpoint for creating a new item
@router.post("/", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """
    Create a new item.
    """
    return crud_item.create_item(db=db, item=item)

# Endpoint for updating an existing item
@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate, db: Session = Depends(get_db)):
    """
    Update an existing item by its ID.
    """
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud_item.update_item(db=db, item_id=item_id, item=item)

# Endpoint for deleting an item
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """
    Delete an item by its ID.
    """
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    crud_item.delete_item(db=db, item_id=item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
