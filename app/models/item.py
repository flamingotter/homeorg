# app/models/item.py
# Defines the SQLAlchemy model for items.

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base # Ensure this import is correct relative to your current structure

print("DEBUG: app.models.item.py executed")

# Define the Item model
class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    quantity = Column(Float, default=0.0)
    unit = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    # Tags will be stored as a comma-separated string for simplicity,
    # but could be a separate table for more complex tag management
    tags = Column(String, nullable=True)
    # folder_id links an item to its parent folder
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    # Relationship to the Folder model
    folder = relationship("Folder", back_populates="items")
    # An item can have multiple images associated with it
    images = relationship(
        "Image",
        back_populates="item",
        cascade="all, delete-orphan",
        # This primaryjoin ensures that an image is linked to an item ONLY if folder_id is None
        primaryjoin="and_(Image.item_id == Item.id, Image.folder_id == None)"
    )

    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', folder_id={self.folder_id})>"
