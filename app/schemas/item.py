# app/schemas/item.py
# Defines Pydantic schemas for Item.

from pydantic import BaseModel, Field
from typing import Optional, List
from .image import ImageResponse # Import ImageResponse for nesting

# Base schema for Item attributes
class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name of the item")
    description: Optional[str] = Field(None, max_length=500, description="Description of the item")
    quantity: float = Field(0.0, ge=0.0, description="Quantity of the item")
    unit: Optional[str] = Field(None, max_length=50, description="Unit of measurement (e.g., 'pcs', 'kg')")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes about the item")
    tags: Optional[str] = Field(None, description="Comma-separated tags for the item")
    folder_id: Optional[int] = Field(None, description="ID of the folder this item belongs to")

# Schema for creating a new Item
class ItemCreate(ItemBase):
    pass

# Schema for updating an existing Item
class ItemUpdate(ItemBase):
    pass

# Schema for reading/responding with Item data
class ItemResponse(ItemBase):
    id: int = Field(..., description="Unique ID of the item")
    # Nested images for this item
    images: List[ImageResponse] = Field(default_factory=list, description="List of images for this item") # Added default_factory

    class Config:
        from_attributes = True # Allows Pydantic to read from SQLAlchemy models

# Forward reference for recursive schema definition if needed (e.g., to ImageResponse)
# ItemResponse.model_rebuild() # Rebuild ItemResponse in case it has forward references (e.g., to ImageResponse)
# This rebuild is handled by app/schemas/__init__.py for overall consistency.
