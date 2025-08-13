from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status, Response
from sqlalchemy.orm import Session
import os # Added
import shutil # Added

from app.db.session import get_db
from app.crud import item as crud_item
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate
from app.schemas.image import ImageCreate, ImageResponse

# Import image crud and router to handle image association
router = APIRouter()

# Define the directory where images will be stored.
# This must match the directory mounted in main.py
IMAGE_DIR = "static/images"
os.makedirs(IMAGE_DIR, exist_ok=True) # Ensure directory exists

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

@router.post("/{item_id}/images/", response_model=ImageResponse, summary="Upload an image for an item")
async def upload_image_for_item(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads an image file and associates it with an item.
    The image file will be saved to `/app/static/images/`.
    """
    db_item = crud_item.get_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Sanitize the filename to prevent path traversal attacks
    filename = os.path.basename(file.filename)
    file_location = os.path.join(IMAGE_DIR, filename)

    try:
        # Save the file to the static directory
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {e}")

    # Create a database record for the image
    image_create_data = ImageCreate(
        filename=filename,
        filepath=f"/static_images/{filename}", # Use /static_images/ prefix for frontend
        description=f"Image for item {db_item.name}",
        item_id=item_id,
        folder_id=None # Ensure folder_id is None for item images
    )
    db_image = crud_image.create_image(db=db, image=image_create_data)

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


# Endpoint for cloning an item
@router.post("/{item_id}/clone", response_model=ItemResponse)
def clone_item(item_id: int, new_folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Clone an existing item. Optionally, place the clone in a different folder.
    """
    cloned_item = crud_item.clone_item(db=db, item_id=item_id, new_folder_id=new_folder_id)
    if cloned_item is None:
        raise HTTPException(status_code=404, detail="Item not found or target folder invalid")
    db.commit()
    db.refresh(cloned_item)
    return cloned_item
