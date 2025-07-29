# app/api/endpoints/item.py
# FastAPI router for Item operations.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

# Import specific crud functions and schemas directly
from app.crud.item import ( # Direct import of functions
    create_item, get_item, get_items, update_item, delete_item, clone_item, move_item
)
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.db.session import get_db

# REMOVED: from app.models import Item, Folder, Image # No longer needed here

router = APIRouter(
    tags=["Items"],
)

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, summary="Create a new item")
def create_new_item(item: ItemCreate, db: Session = Depends(get_db)):
    """
    Create a new inventory item with the provided details.
    """
    db_item = create_item(db=db, item=item) # Direct call to CRUD function
    return db_item

@router.get("/{item_id}", response_model=ItemResponse, summary="Get an item by ID")
def read_item(item_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single item by its unique ID.
    """
    db_item = get_item(db=db, item_id=item_id) # Direct call to CRUD function
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return db_item

@router.get("/", response_model=List[ItemResponse], summary="Get all items or filter by folder")
def read_items(skip: int = 0, limit: int = 100, folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Retrieve a list of all items, with optional pagination and filtering by folder ID.
    """
    items = get_items(db=db, skip=skip, limit=limit, folder_id=folder_id) # Direct call to CRUD function
    return items

@router.put("/{item_id}", response_model=ItemResponse, summary="Update an item by ID")
def update_existing_item(item_id: int, item: ItemUpdate, db: Session = Depends(get_db)):
    """
    Update an existing item's details by its ID.
    """
    db_item = update_item(db=db, item_id=item_id, item=item) # Direct call to CRUD function
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return db_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an item by ID")
def delete_existing_item(item_id: int, db: Session = Depends(get_db)):
    """
    Delete an item by its ID. This will also delete associated images.
    """
    db_item = delete_item(db=db, item_id=item_id) # Direct call to CRUD function
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"message": "Item deleted successfully"}

@router.post("/{item_id}/clone", response_model=ItemResponse, summary="Clone an item by ID")
def clone_existing_item(item_id: int, db: Session = Depends(get_db)):
    """
    Create a clone of an existing item, including its images.
    The cloned item's name will be appended with " (Cloned)".
    """
    cloned_item = clone_item(db=db, item_id=item_id) # Direct call to CRUD function
    if cloned_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return cloned_item

@router.patch("/{item_id}/move", response_model=ItemResponse, summary="Move an item to a different folder")
def move_item_to_folder(item_id: int, new_folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Move an item to a new folder. Set `new_folder_id` to `None` to move it to the root.
    """
    db_item = move_item(db=db, item_id=item_id, new_folder_id=new_folder_id) # Direct call to CRUD function
    if db_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found or target folder invalid")
    return db_item
