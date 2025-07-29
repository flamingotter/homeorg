# app/models/__init__.py
# This file imports all individual SQLAlchemy models to ensure they are registered
# with Base.metadata when 'app.models' is imported, AND to make the classes
# directly accessible under the 'app.models' namespace.

print("DEBUG: app.models.__init__.py executed")

from .folder import Folder
from .item import Item
from .image import Image
