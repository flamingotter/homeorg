from pydantic import BaseModel, constr
from typing import Optional
from datetime import date
from enum import Enum
from . import models

class Unit(Enum):
    UNIT = "Unit"
    EACH = "Each"
    BOX = "Box"
    POUND = "Pound"
    KILOGRAM = "Kilogram"
    GRAM = "Gram"
    OUNCE = "Ounce"
    YARD = "Yard"
    GALLON = "Gallon"
    LITER = "Liter"
    ROLL = "Roll"
    PACK = "Pack"
    PALLET = "Pallet"
    CASE = "Case"

class FolderCreate(BaseModel):
    name: constr(min_length=1, max_length=255)
    parent_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    image_url: Optional[str] = None

class FolderUpdate(BaseModel):
    name: Optional[constr(min_length=1, max_length=255)] = None
    parent_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    image_url: Optional[str] = None

class Folder(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        orm_mode = True

class ItemCreate(BaseModel):
    name: constr(min_length=1, max_length=255)
    folder_id: Optional[int] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    tags: Optional[str] = None
    acquired_date: Optional[date] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[constr(min_length=1, max_length=255)] = None
    folder_id: Optional[int] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    tags: Optional[str] = None
    acquired_date: Optional[date] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None

class Item(BaseModel):
    id: int
    name: str
    folder_id: Optional[int] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    tags: Optional[str] = None
    acquired_date: Optional[date] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        orm_mode = True

class ImageCreate(BaseModel):
    filename: constr(min_length=1, max_length=255)
    item_id: Optional[int] = None
    folder_id: Optional[int] = None

class ImageUpdate(BaseModel):
    filename: Optional[constr(min_length=1, max_length=255)] = None
    item_id: Optional[int] = None
    folder_id: Optional[int] = None

class Image(BaseModel):
    id: int
    filename: str
    item_id: Optional[int] = None
    folder_id: Optional[int] = None

    class Config:
        orm_mode = True