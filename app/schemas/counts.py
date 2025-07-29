# app/schemas/counts.py
# Defines Pydantic schema for real-time counts.

from pydantic import BaseModel, Field

# Schema for real-time counts
class CountsResponse(BaseModel):
    total_folders: int = Field(..., description="Total number of folders")
    total_items: int = Field(..., description="Total number of items")
    total_quantity: float = Field(..., description="Total quantity of all items")
