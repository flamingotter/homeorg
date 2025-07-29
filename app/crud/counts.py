# app/crud/counts.py
# Contains CRUD operations for real-time counts.

from __future__ import annotations # MUST be the very first import

from sqlalchemy.orm import Session
from sqlalchemy import func

# Import models and schemas from the top-level 'app' package
from app import models, schemas

def get_realtime_counts(db: Session) -> schemas.CountsResponse: # Direct type hint
    """
    Calculates and returns real-time counts of folders, items, and their total quantity.
    """
    total_folders = db.query(models.Folder).count() # Use models.Folder
    total_items = db.query(models.Item).count() # Use models.Item
    # Sum of float quantities
    total_quantity = db.query(func.sum(models.Item.quantity)).scalar() or 0.0 # Use models.Item.quantity

    return schemas.CountsResponse(
        total_folders=total_folders,
        total_items=total_items,
        total_quantity=total_quantity
    )
