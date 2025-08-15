# app/db/session.py
# This file handles database session management and initial table creation.

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.base import Base # Import Base from its new, dedicated location

# Get the database URL from environment variables, defaulting to a local SQLite file
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///data/data.db")

# Create the SQLAlchemy engine
# connect_args is needed for SQLite to allow multiple threads to access the database
# check_same_thread=False is crucial for SQLite when used with FastAPI's default async behavior
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class
# This will be used to create database sessions
# autocommit=False means changes are not committed automatically
# autoflush=False means changes are not flushed to the database automatically
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get a database session
# This function will be used by FastAPI's dependency injection system
# It ensures that a database session is created for each request and then closed afterwards
def get_db():
    db = SessionLocal()
    try:
        # Enable foreign key enforcement for SQLite
        # This must be done per connection for SQLite
        db.execute(text("PRAGMA foreign_keys = ON"))
        yield db
    finally:
        db.close()

def create_database_and_tables():
    """
    Creates the database and tables if they don't exist, including indexes.
    This function is called once at application startup.
    """
    # REMOVED: import app.models
    # Models are already imported by app.main.py and registered with Base.metadata

    # Ensure the directory for the SQLite database exists
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

    # Create all tables defined in Base.metadata (from app/models/ folder)
    # Added checkfirst=True to prevent "Table already defined" errors
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print(f"Database and tables created/updated at {DATABASE_URL}")

    # Create indexes for frequently queried foreign key columns
    # Using CREATE INDEX IF NOT EXISTS to avoid errors if indexes already exist
    with engine.connect() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_items_folder_id ON items (folder_id);"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_images_folder_id ON images (folder_id);"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_images_item_id ON images (item_id);"))
        connection.commit() # Commit the index creation

    print("Indexes created.")