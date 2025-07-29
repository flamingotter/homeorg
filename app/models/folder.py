# app/models/folder.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base # Ensure this import is correct relative to your current structure

print("DEBUG: app.models.folder.py executed")

# Define the Folder model
class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    # parent_id allows for hierarchical folder structure
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    # Relationships
    # A folder can have multiple subfolders
    subfolders = relationship(
        "Folder",
        # Explicit primaryjoin for self-referential one-to-many
        # This means: Folder.id (of the parent) == Folder.parent_id (of the child)
        primaryjoin="Folder.id == Folder.parent_id",
        # Explicitly declare the foreign key column(s) involved in this relationship
        # from the perspective of the *child* (the "remote" side).
        foreign_keys=[parent_id], # Refers to the parent_id column defined in this class
        backref="parent", # Allows accessing the parent folder from a subfolder
        cascade="all, delete-orphan", # When a folder is deleted, its subfolders are also deleted
        uselist=True, # Explicitly state this is a collection (default for one-to-many, but good for clarity)
        remote_side=[id], # THIS IS THE CRUCIAL ADDITION to disambiguate the relationship direction
        single_parent=True # THIS IS THE NEW ADDITION to allow delete-orphan cascade on self-referential relationship
    )
    # A folder can contain multiple items
    items = relationship(
        "Item",
        back_populates="folder", # Links back to the 'folder' attribute in the Item model
        cascade="all, delete-orphan" # When a folder is deleted, its items are also deleted
    )
    # A folder can have multiple images directly associated with it
    images = relationship(
        "Image",
        back_populates="folder",
        cascade="all, delete-orphan",
        # This primaryjoin ensures that an image is linked to a folder ONLY if item_id is None
        primaryjoin="and_(Image.folder_id == Folder.id, Image.item_id == None)"
    )

    def __repr__(self):
        return f"<Folder(id={self.id}, name='{self.name}', parent_id={self.parent_id})>"
