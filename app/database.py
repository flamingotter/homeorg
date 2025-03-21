# app/database.py
import os
from sqlalchemy import create_engine, text # type: ignore
from sqlalchemy.ext.declarative import declarative_base # type: ignore
from sqlalchemy.orm import sessionmaker # type: ignore

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////data/data.db")  # Default to local file
#DATABASE_URL now supports relative paths to your docker volume.

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} # SQLite-specific, important!
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        db.execute(text("PRAGMA foreign_keys = ON"))  # Enable foreign keys
        yield db
    finally:
        db.close()

def create_database_and_tables():
    """Creates the database and tables if they don't exist."""

    # Check if the database URL is SQLite and extract the path
    if DATABASE_URL.startswith("sqlite:///"):
        db_path = DATABASE_URL.replace("sqlite:///", "")

        # Get the directory of the database file
        db_dir = os.path.dirname(db_path)

        # Create the directory if it doesn't exist
        if db_dir and not os.path.exists(db_dir):
            try:
                os.makedirs(db_dir)  # Create the directory, including parent dirs
                print(f"Created database directory: {db_dir}")
            except OSError as e:
                print(f"Error creating directory {db_dir}: {e}")
                # Handle the error appropriately, e.g., raise, exit, log
                raise

    # Now that the directory exists (or was already there), create the tables
    Base.metadata.create_all(bind=engine)
    print(f"Database and tables created/updated at {DATABASE_URL}")
