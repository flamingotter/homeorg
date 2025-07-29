# app/models/image.py
# Defines the SQLAlchemy model for images, which can be linked to items or folders.

from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base # Import Base from the new, centralized location

print("DEBUG: app.models.image.py executed")

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False, index=True)
    filepath = Column(String, nullable=False) # Path to where the image is stored (e.g., S3 URL, local path)
    description = Column(Text, nullable=True)
    
    # Foreign keys to link image to either an item or a folder, but not both.
    # These are nullable to allow an image to be associated with either.
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    # Relationships
    # back_populates links back to the 'images' attribute in Item and Folder models.
    # foreign_keys specifies which column(s) are used for this relationship,
    # important when multiple foreign keys point to the same table (like in Folder.images).
    item = relationship("Item", back_populates="images", foreign_keys=[item_id])
    folder = relationship("Folder", back_populates="images", foreign_keys=[folder_id])

    def __repr__(self):
        return f"<Image(id={self.id}, filename='{self.filename}', item_id={self.item_id}, folder_id={self.folder_id})>"
