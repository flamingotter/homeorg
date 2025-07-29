# app/schemas/__init__.py
# This file imports all individual Pydantic schemas to make them accessible
# when 'app.schemas' is imported.

# Import Image schemas first, as Item and Folder schemas depend on ImageResponse
from .image import ImageBase, ImageCreate, ImageUpdate, ImageResponse

# Then import Item and Folder schemas
from .item import ItemBase, ItemCreate, ItemUpdate, ItemResponse
from .folder import FolderBase, FolderCreate, FolderUpdate, FolderResponse

# Finally, import other independent schemas
from .counts import CountsResponse

# Rebuild models after all have been defined to resolve forward references
# The order of rebuild calls should also follow dependencies if possible,
# but as long as all are imported, Pydantic's rebuild mechanism should handle it.
FolderResponse.model_rebuild()
ItemResponse.model_rebuild()
ImageResponse.model_rebuild() # Good practice to include, though might not be strictly necessary if it has no internal forward refs
