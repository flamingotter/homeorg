# app/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from starlette.staticfiles import StaticFiles
import os # Import os for path manipulation

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

# IMPORTANT: Include all individual API routers first.
# This ensures that API requests are handled by the routers before any static file mounts.
app.include_router(folder.router, prefix="/folders")
app.include_router(item.router, prefix="/items")
app.include_router(image.router, prefix="/images")
app.include_router(counts.router, prefix="/counts")

# Mount static files *after* all API routers.
# This ensures that API routes take precedence over static file serving for conflicting paths.

# Mount a separate StaticFiles instance specifically for images.
# This will serve files from the "static/images" directory on the host
# when requests come to the "/static_images" URL path in the browser.
app.mount("/static_images", StaticFiles(directory="static/images"), name="static_images")

# Mount static files for the main frontend (index.html, styles.css, script.js)
# This will serve files directly from the "static" directory at the root "/".
# Requests to "/" will look for "index.html" inside "static".
app.mount("/", StaticFiles(directory="static", html=True), name="static_root")
