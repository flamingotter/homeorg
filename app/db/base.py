# app/db/base.py
# This file defines the declarative base for SQLAlchemy models.

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
print(f"DEBUG: app.db.base.py executed. Base object ID: {id(Base)}")
