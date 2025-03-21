# app/database.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////data/data.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        db.execute(text("PRAGMA foreign_keys = ON"))
        yield db
    finally:
        db.close()

def create_database_and_tables():
    """Creates the database and tables if they don't exist, including indexes."""

    if DATABASE_URL.startswith("sqlite:///"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            try:
                os.makedirs(db_dir)
                print(f"Created database directory: {db_dir}")
            except OSError as e:
                print(f"Error creating directory {db_dir}: {e}")
                raise

    Base.metadata.create_all(bind=engine)
    print(f"Database and tables created/updated at {DATABASE_URL}")

    # Create indexes
    with engine.connect() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_items_folder_id ON items (folder_id);"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_images_folder_id ON images (folder_id);"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_images_item_id ON images (item_id);"))

    print("Indexes created.")