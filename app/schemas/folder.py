# app/schemas/folder.py
# Defines Pydantic schemas for Folder.

from pydantic import BaseModel, Field
from typing import Optional, List
from .item import ItemResponse # Import ItemResponse for nesting
from .image import ImageResponse # Import ImageResponse for nesting

# Base schema for Folder attributes
class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name of the folder")
    description: Optional[str] = Field(None, max_length=500, description="Description of the folder")
    notes: Optional[str] = Field(None, description="Notes for the folder")
    tags: Optional[str] = Field(None, description="Tags for the folder, comma-separated")
    parent_id: Optional[int] = Field(None, description="ID of the parent folder (None for root folders)")

# Schema for creating a new Folder
class FolderCreate(FolderBase):
    pass

# Schema for updating an existing Folder
class FolderUpdate(FolderBase):
    pass

# Schema for cloning a folder, to specify the new parent ID
class FolderCloneRequest(BaseModel):
    new_parent_id: Optional[int] = Field(None, description="ID of the new parent folder for the cloned folder (None for root)")

# Schema for reading/responding with Folder data
# This includes nested items and subfolders for a hierarchical view
class FolderResponse(FolderBase):
    id: int = Field(..., description="Unique ID of the folder")
    # Nested items within this folder
    items: List[ItemResponse] = Field(default_factory=list, description="List of items in this folder") # Ensure default_factory=list
    # Nested subfolders within this folder (forward reference for recursive definition)
    subfolders: List["FolderResponse"] = Field(default_factory=list, description="List of subfolders within this folder") # Ensure default_factory=list
    # Nested images for this folder
    images: List[ImageResponse] = Field(default_factory=list, description="List of images for this folder") # Ensure default_factory=list

    class Config:
        from_attributes = True # Allows Pydantic to read from SQLAlchemy models

# Forward reference for recursive schema definition (FolderResponse containing FolderResponse)
FolderResponse.model_rebuild()