# app/api/endpoints/counts.py
# FastAPI router for real-time application counts.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Import specific crud functions and schemas directly
from app.crud.counts import get_realtime_counts # Direct import of function
from app.schemas.counts import CountsResponse
from app.db.session import get_db

router = APIRouter(
    tags=["Counts"],
)

@router.get("/", response_model=CountsResponse, summary="Get real-time application counts")
def get_counts(db: Session = Depends(get_db)):
    """
    Retrieves real-time counts for total folders, items, and their total quantity.
    """
    return get_realtime_counts(db) # Direct call
