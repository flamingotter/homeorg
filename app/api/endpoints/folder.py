# app/api/endpoints/folder.py
# FastAPI router for Folder operations.


from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
import os # Import os for file path manipulation
import logging # Import logging for debugging

# Import specific crud functions and schemas directly
from app.crud.folder import ( # Direct import of functions
    create_folder, get_folder, get_root_folders, update_folder, delete_folder,
    clone_folder, move_folder, calculate_folder_quantity
)
from app.crud.image import create_image as crud_create_image # Import image CRUD
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse
from app.schemas.item import ItemResponse # Needed for read_folder_items response
from app.schemas.image import ImageCreate, ImageResponse # Needed for _post_process_folder_response and image upload
# REMOVED: from app.models import Folder, Item, Image # No longer needed here
from app.db.session import get_db

router = APIRouter(
    tags=["Folders"],
    responses={404: {"description": "Not found"}},
)

logging.basicConfig(level=logging.INFO) # Configure basic logging

def _post_process_folder_response(folder_model) -> FolderResponse: # Removed type hint for folder_model to avoid direct model import
    """
    Helper to ensure relationship attributes are lists (not None) before Pydantic serialization.
    This also recursively processes subfolders to ensure they are Pydantic schemas.
    """
    # Convert SQLAlchemy model to a dictionary first
    folder_dict = folder_model.__dict__.copy()

    # Explicitly ensure list types for relationships AND recursively process subfolders
    folder_dict['subfolders'] = [
        _post_process_folder_response(sf)
        for sf in folder_model.subfolders
    ] if folder_model.subfolders is not None else []

    folder_dict['items'] = folder_model.items if folder_model.items is not None else []
    folder_dict['images'] = folder_model.images if folder_model.images is not None else []
    
    # Use Pydantic's model_validate to create the response schema from the processed dictionary
    return FolderResponse.model_validate(folder_dict)


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED, summary="Create a new folder")
def create_new_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    """
    Create a new inventory folder with the provided details.
    """
    db_folder = create_folder(db=db, folder=folder) # Direct call
    return _post_process_folder_response(db_folder)


@router.get("/{folder_id}", response_model=FolderResponse, summary="Get a folder by ID")
def read_folder(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single folder by its unique ID, including its nested items and subfolders.
    """
    db_folder = get_folder(db=db, folder_id=folder_id) # Direct call
    if db_folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return _post_process_folder_response(db_folder)


@router.get("/", response_model=List[FolderResponse], summary="Get all root folders")
def read_root_folders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve a list of all root-level folders (folders with no parent), with pagination.
    """
    folders = get_root_folders(db=db, skip=skip, limit=limit) # Direct call
    # Apply post-processing to each folder in the list
    return [_post_process_folder_response(f) for f in folders]


@router.put("/{folder_id}", response_model=FolderResponse, summary="Update a folder by ID")
def update_existing_folder(folder_id: int, folder: FolderUpdate, db: Session = Depends(get_db)):
    """
    Update an existing folder's details by its ID.
    """
    db_folder = update_folder(db=db, folder_id=folder_id, folder=folder) # Direct call
    if db_folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return _post_process_folder_response(db_folder)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a folder by ID")
def delete_existing_folder(folder_id: int, db: Session = Depends(get_db)):
    """
    Delete a folder by its ID. This will recursively delete all its subfolders, items, and associated images.
    """
    db_folder = delete_folder(db=db, folder_id=folder_id)
    if db_folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{folder_id}/clone", response_model=FolderResponse, summary="Clone a folder by ID")
def clone_existing_folder(folder_id: int, new_parent_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Create a clone of an existing folder, including all its subfolders, items, and images recursively.
    Optionally specify a `new_parent_id` to place the cloned folder.
    """
    cloned_folder = clone_folder(db=db, folder_id=folder_id, new_parent_id=new_parent_id) # Direct call
    if cloned_folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found or target parent invalid")
    return _post_process_folder_response(cloned_folder)


@router.patch("/{folder_id}/move", response_model=FolderResponse, summary="Move a folder to a different parent folder")
def move_folder_to_parent(folder_id: int, new_parent_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Move a folder to a new parent folder. Set `new_parent_id` to `None` to move it to the root.
    Prevents moving a folder into itself or its subfolders.
    """
    db_folder = move_folder(db=db, folder_id=folder_id, new_parent_id=new_parent_id) # Direct call
    if db_folder is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder not found or invalid target parent")
    return _post_process_folder_response(db_folder)


# Endpoint to get count of items in a specific folder (corrected to use direct count)
@router.get("/{folder_id}/items/count", summary="Get count of items in a specific folder")
def get_items_count_in_folder(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the total number of items directly within a specific folder.
    """
    # Ensure folder exists
    from app import models # Temporarily import models here for the query
    folder_obj = get_folder(db, folder_id) # Use get_folder from this module
    if not folder_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    
    # Use direct SQL count to avoid NoneType errors and load entire collection
    count = db.query(func.count(models.Item.id)).filter(models.Item.folder_id == folder_id).scalar() # Use imported models.Item
    return {"folder_id": folder_id, "item_count": count if count is not None else 0}


# Endpoint to get count of subfolders in a specific folder (corrected to use direct count)
@router.get("/{folder_id}/subfolders/count", summary="Get count of subfolders in a specific folder")
def get_subfolders_count_in_folder(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the total number of direct subfolders within a specific folder.
    """
    # Ensure folder exists
    from app import models # Temporarily import models here for the query
    folder_obj = get_folder(db, folder_id) # Use get_folder from this module
    if not folder_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    
    # Use direct SQL count to avoid NoneType errors and load entire collection
    count = db.query(func.count(models.Folder.id)).filter(models.Folder.parent_id == folder_id).scalar() # Use imported models.Folder
    return {"folder_id": folder_id, "subfolder_count": count if count is not None else 0}


# NEW: Endpoint to get direct subfolders of a folder
@router.get("/{folder_id}/folders", response_model=List[FolderResponse], summary="Get direct subfolders of a folder")
def read_sub_folders(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a list of direct subfolders within a specific folder.
    """
    # Ensure the parent folder exists
    from app import models # Temporarily import models here for the query
    get_folder(db, folder_id) # This will raise 404 if not found

    subfolders = db.query(models.Folder).options( # Use models.Folder
        joinedload(models.Folder.items).joinedload(models.Item.images), # Use models.Folder.items, models.Item.images
        joinedload(models.Folder.subfolders), # Use models.Folder.subfolders
        joinedload(models.Folder.images) # Use models.Folder.images
    ).filter(models.Folder.parent_id == folder_id).all()
    
    # Apply post-processing to each subfolder
    return [_post_process_folder_response(f) for f in subfolders]


# NEW: Endpoint to get items directly within a folder
@router.get("/{folder_id}/items", response_model=List[ItemResponse], summary="Get items in a folder")
def read_folder_items(folder_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a list of items directly contained within a specific folder.
    """
    # Ensure the folder exists
    from app import models # Temporarily import models here for the query
    get_folder(db, folder_id) # This will raise 404 if not found

    items = db.query(models.Item).options( # Use models.Item
        joinedload(models.Item.images) # Eagerly load item images
    ).filter(models.Item.folder_id == folder_id).all()
    return items


# NEW: Endpoint to get total quantity of items (and sub-items) within a folder
@router.get("/{folder_id}/quantity", summary="Get total quantity in folder (and subfolders)")
def get_folder_total_quantity(folder_id: int, db: Session = Depends(get_db)):
    """
    Calculates the total quantity of items within a specified folder,
    including items in its subfolders recursively.
    """
    from app import models # Temporarily import models here for the query
    get_folder(db, folder_id) # Ensure folder exists
    # Direct call to the imported function
    total_quantity = calculate_folder_quantity(db, folder_id)
    return {"quantity": total_quantity}


# NEW: Endpoint to upload an image for a folder
@router.post("/{folder_id}/images/", response_model=ImageResponse, summary="Upload an image for a folder")
async def upload_image_for_folder(folder_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads an image file and associates it with a folder.
    The image file will be saved to `/app/static/images/`.
    """
    db_folder = get_folder(db, folder_id) # Use the existing get_folder function
    if db_folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    # Define the directory to save images
    # This path must match the volume mount in docker-compose.yml
    UPLOAD_DIRECTORY = "/app/static/images"
    os.makedirs(UPLOAD_DIRECTORY, exist_ok=True) # Ensure directory exists

    file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    logging.info(f"Attempting to save file to: {file_path}")

    try:
        # Save the file to the static directory
        with open(file_path, "wb") as image_file:
            image_data = await file.read()
            logging.info(f"File size: {len(image_data)} bytes")
            image_file.write(image_data)

        # Create a database record for the image
        # Use the ImageCreate schema to validate and pass data to CRUD
        image_create_data = ImageCreate(
            filename=file.filename,
            filepath=f"/static_images/{file.filename}", # Use /static_images/ prefix for frontend
            description=f"Image for folder {db_folder.name}",
            folder_id=folder_id,
            item_id=None # Ensure item_id is None for folder images
        )
        db_image = crud_create_image(db=db, image=image_create_data) # Use image CRUD function

        return db_image

    except Exception as e:
        logging.error(f"Error saving file or creating image record for folder: {e}")
        db.rollback() # Rollback if image record creation fails after file save
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error saving file or creating image record: {e}")
