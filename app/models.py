# app/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from .database import Base
from enum import Enum

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

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    image_url = Column(String)

    children = relationship("Folder", remote_side=[id], foreign_keys=[parent_id])
    items = relationship("Item", back_populates="folder")
    images = relationship("Image", back_populates="folder")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    quantity = Column(Integer, nullable=True)
    unit = Column(String, nullable=True)
    tag = Column(String, nullable=True)
    acquired_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    image_url = Column(String)

    folder = relationship("Folder", back_populates="items")
    images = relationship("Image", back_populates="item")

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    item = relationship("Item", back_populates="images")
    folder = relationship("Folder", back_populates="images")