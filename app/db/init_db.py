from sqlalchemy.orm import Session
from app.crud import folder as crud_folder
from app.crud import item as crud_item
from app.crud import image as crud_image
from app.schemas.folder import FolderCreate
from app.schemas.item import ItemCreate
from app.schemas.image import ImageCreate
from app.db.session import SessionLocal

def init_db():
    db = SessionLocal()
    try:
        # Check if folders already exist
        folders = crud_folder.get_root_folders(db)
        if len(folders) > 0:
            print("Database already seeded.")
            return

        print("Seeding database with initial data...")

        # Image filenames
        folder_images = ["folder01.png", "folder02.jpg", "folder03.png", "folder04.png"]
        item_images = ["item01.jpg", "item02.png", "item03.png", "item04.png", "item05.png", "item06.jpg"]

        # Create root folders
        folder1 = crud_folder.create_folder(db, FolderCreate(name="Living Room", description="Main living area"))
        crud_image.create_image(db, ImageCreate(filename=folder_images[0], folder_id=folder1.id, filepath=f"/static_images/{folder_images[0]}"))

        folder2 = crud_folder.create_folder(db, FolderCreate(name="Kitchen", description="All things food-related"))
        crud_image.create_image(db, ImageCreate(filename=folder_images[1], folder_id=folder2.id, filepath=f"/static_images/{folder_images[1]}"))

        folder3 = crud_folder.create_folder(db, FolderCreate(name="Garage", description="Tools and storage"))
        crud_image.create_image(db, ImageCreate(filename=folder_images[2], folder_id=folder3.id, filepath=f"/static_images/{folder_images[2]}"))

        # Create subfolders
        subfolder1 = crud_folder.create_folder(db, FolderCreate(name="Entertainment Center", parent_id=folder1.id))
        crud_image.create_image(db, ImageCreate(filename=folder_images[3], folder_id=subfolder1.id, filepath=f"/static_images/{folder_images[3]}"))

        subfolder2 = crud_folder.create_folder(db, FolderCreate(name="Pantry", parent_id=folder2.id))

        # Create items
        item1 = crud_item.create_item(db, ItemCreate(name="Sofa", folder_id=folder1.id, quantity=1, description="Comfy couch"))
        crud_image.create_image(db, ImageCreate(filename=item_images[0], item_id=item1.id, filepath=f"/static_images/{item_images[0]}"))

        item2 = crud_item.create_item(db, ItemCreate(name="Coffee Table", folder_id=folder1.id, quantity=1))
        crud_image.create_image(db, ImageCreate(filename=item_images[1], item_id=item2.id, filepath=f"/static_images/{item_images[1]}"))

        item3 = crud_item.create_item(db, ItemCreate(name='65" OLED TV', folder_id=subfolder1.id, quantity=1, tags="electronics, sony"))
        crud_image.create_image(db, ImageCreate(filename=item_images[2], item_id=item3.id, filepath=f"/static_images/{item_images[2]}"))

        item4 = crud_item.create_item(db, ItemCreate(name="Plates", folder_id=folder2.id, quantity=8, unit="pcs"))
        crud_image.create_image(db, ImageCreate(filename=item_images[3], item_id=item4.id, filepath=f"/static_images/{item_images[3]}"))

        item5 = crud_item.create_item(db, ItemCreate(name="Silverware Set", folder_id=folder2.id, quantity=1, unit="set"))
        crud_image.create_image(db, ImageCreate(filename=item_images[4], item_id=item5.id, filepath=f"/static_images/{item_images[4]}"))

        crud_item.create_item(db, ItemCreate(name="Canned Beans", folder_id=subfolder2.id, quantity=12, unit="cans"))

        item7 = crud_item.create_item(db, ItemCreate(name="Christmas Decorations", folder_id=folder3.id, quantity=5, unit="boxes"))
        crud_image.create_image(db, ImageCreate(filename=item_images[5], item_id=item7.id, filepath=f"/static_images/{item_images[5]}"))
        
        crud_item.create_item(db, ItemCreate(name="Ladder", quantity=1))

        print("Database seeding complete.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()