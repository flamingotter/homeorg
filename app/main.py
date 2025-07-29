# app/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from starlette.staticfiles import StaticFiles

# Explicitly import app.models to ensure all SQLAlchemy models are loaded and registered
# with Base.metadata at application startup, preventing "Table already defined" errors.
import app.models

from app.db.session import create_database_and_tables

# Directly import endpoint routers
from app.api.endpoints import item, folder, image, counts

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    print("Application starting up...")
    create_database_and_tables() # Call the function from the new location
    yield
    # Shutdown event
    print("Application shutting down.")

app = FastAPI(
    title="Inventory Management API",
    description="API for managing inventory items, folders, and images.",
    version="1.0.0",
    lifespan=lifespan
)

# Mount a separate StaticFiles instance specifically for images.
# This will serve files from the "static/images" directory on the host
# when requests come to the "/static_images" URL path in the browser.
# This must be mounted *before* the API router to avoid conflicts with API routes.
app.mount("/static_images", StaticFiles(directory="static/images"), name="static_images")

# Include all individual routers directly, applying their prefixes here.
# The routers themselves (in app/api/endpoints/*.py) should NOT have prefixes defined.
app.include_router(folder.router, prefix="/folders")
app.include_router(item.router, prefix="/items")
app.include_router(image.router, prefix="/images")
app.include_router(counts.router, prefix="/counts")

# Mount static files for the main frontend (index.html, styles.css, script.js)
# This will serve files directly from the "static" directory at the root "/".
# Requests to "/" will look for "index.html" inside "static".
# This must be mounted *after* the API routers to ensure API calls are handled first.
app.mount("/", StaticFiles(directory="static", html=True), name="static_root")

