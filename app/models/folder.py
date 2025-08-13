# app/models/folder.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
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
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    # Explicitly define the many-to-one relationship to the parent folder
    parent = relationship(
        "Folder",
        remote_side=[id], # 'id' is the primary key of the parent
        back_populates="subfolders", # Links back to the 'subfolders' attribute in the child Folder model
        uselist=False, # A folder has only one parent
    )

    # Define the one-to-many relationship to subfolders
    subfolders = relationship(
        "Folder",
        back_populates="parent", # Links back to the 'parent' attribute in the parent Folder model
        cascade="all, delete-orphan",
        single_parent=True,
        uselist=True,
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
