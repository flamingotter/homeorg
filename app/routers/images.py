#app/routers/images.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, schemas

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/images/", response_model=schemas.Image)
def create_image(image: schemas.ImageCreate, db: Session = Depends(get_db)):
    """Create a new image."""
    db_image = models.Image(**image.dict())
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

@router.get("/images/", response_model=list[schemas.Image])
def read_images(db: Session = Depends(get_db)):
    """Read all images."""
    return db.query(models.Image).all()

@router.get("/images/{image_id}", response_model=schemas.Image)
def read_image(image_id: int, db: Session = Depends(get_db)):
    """Read an image by ID."""
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    return db_image

@router.patch("/images/{image_id}", response_model=schemas.Image)
def update_image(image_id: int, image: schemas.ImageUpdate, db: Session = Depends(get_db)):
    """Update an existing image."""
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    for key, value in image.dict(exclude_unset=True).items():
        setattr(db_image, key, value)
    db.commit()
    db.refresh(db_image)
    return db_image

@router.delete("/images/{image_id}", response_model=schemas.Image)
def delete_image(image_id: int, db: Session = Depends(get_db)):
    """Delete an image by ID."""
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(db_image)
    db.commit()
    return db_image
