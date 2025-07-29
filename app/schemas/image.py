# app/schemas/image.py
# Defines Pydantic schemas for Image.

from pydantic import BaseModel, Field
from typing import Optional

# Base schema for Image attributes
class ImageBase(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255, description="Name of the image file")
    filepath: str = Field(..., min_length=1, description="Path or URL to the image file")
    description: Optional[str] = Field(None, max_length=500, description="Description of the image")
    item_id: Optional[int] = Field(None, description="ID of the item this image belongs to")
    folder_id: Optional[int] = Field(None, description="ID of the folder this image belongs to")

# Schema for creating a new Image
class ImageCreate(ImageBase):
    pass

# Schema for updating an existing Image
class ImageUpdate(ImageBase):
    pass

# Schema for reading/responding with Image data
class ImageResponse(ImageBase):
    id: int = Field(..., description="Unique ID of the image")

    class Config:
        from_attributes = True # Allows Pydantic to read from SQLAlchemy models
