# app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles #import StaticFiles
from app.database import create_database_and_tables
from app.routers import items, folders, images

import sqlalchemy

print(f"SQLAlchemy version: {sqlalchemy.__version__}")

app = FastAPI()

create_database_and_tables()

app.include_router(items.router)
app.include_router(folders.router)
app.include_router(images.router)

app.mount("/static", StaticFiles(directory="/app/static"), name="static")

@app.get("/")
def read_root():
    return {"Hello": "World"}