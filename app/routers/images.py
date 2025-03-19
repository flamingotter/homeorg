#app/routers/images.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/images/")
def create_image(image: dict, db: Session = Depends(get_db)):
    db_image = models.Image(filename=image["filename"], item_id=image.get("item_id"), folder_id=image.get("folder_id"))
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image.__dict__