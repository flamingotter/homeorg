// /static/static.js
let currentFolderId = null; // Track the current folder ID

function updateCounts(totalQuantity) {
    let url = '/folders/count';
    if (currentFolderId) {
        url = `/folders/${currentFolderId}/count`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            document.getElementById('folder-count').textContent = data;
        })
        .catch(error => console.error('Error fetching folder count:', error));

    let itemsUrl = '/items/count';
    if (currentFolderId) {
        itemsUrl = `/folders/${currentFolderId}/items/count`;
    }

    fetch(itemsUrl)
        .then(response => response.json())
        .then(data => {
            document.getElementById('item-count').textContent = data;
        })
        .catch(error => console.error('Error fetching item count:', error));

    // Update total quantity if provided
    if (totalQuantity !== undefined) {
        document.getElementById('total-quantity').textContent = totalQuantity;
    }
}

async function displayItems(items) {
    const itemGrid = document.getElementById('item-grid');
    itemGrid.innerHTML = '';

    for (const item of items) {
        if (item.folder_id === currentFolderId || (currentFolderId === null && item.folder_id === null)) {
            const images = await fetch(`/images/?item_id=${item.id}`).then(response => response.json());

            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';

            let imageUrl = 'https://via.placeholder.com/80';
            if (images && images.length > 0) {
                imageUrl = `/static/images/${images[0].filename}`;
            }

            itemCard.innerHTML = `
                <img src="${imageUrl}" alt="${item.name}" class="thumbnail">
                <div class="item-details">
                    <h3 class="item-title">${item.name}</h3>
                    <div class="item-info">
                        ${item.quantity} ${item.unit}
                    </div>
                </div>
                <div class="item-actions">
                    <i class="material-icons more-options-button">more_vert</i>
                    <div class="options-menu" data-item-id="${item.id}" style="display: none; position: absolute; background-color: #555; border: 1px solid #777; border-radius: 5px; padding: 5px; right: 0; top: 100%; transform: translateY(5px);">
                        <div class="menu-item details-item">Details</div>
                        <div class="menu-item move-item">Move</div>
                        <div class="menu-item clone-item">Clone</div>
                        <div class="menu-item delete-item">Delete</div>
                    </div>
                </div>
            `;

            itemCard.addEventListener('click', (event) => {
                if (!event.target.classList.contains('more-options-button') && !event.target.classList.contains('menu-item')) {
                    displayItemDetails(item);
                }
            });

            itemGrid.appendChild(itemCard);
        }
    }
}

document.getElementById('item-details-back-button').addEventListener('click', () => {
    document.getElementById('item-details-view').style.display = 'none';
    document.getElementById('items-grid').style.display = 'block';
    document.querySelector('.counts').style.display = 'block'; // Show the counts div
    if(currentFolderId){
        document.getElementById('back-button').style.display = 'block';
    }

});

function displayItemDetails(item) {
    document.getElementById('item-details-title').textContent = item.name;

    // Handle multiple images
    const imageContainer = document.getElementById('item-details-image-container');
    imageContainer.innerHTML = ''; // Clear previous images

    fetch(`/images/?item_id=${item.id}`)
        .then(response => response.json())
        .then(images => {
            if (images && images.length > 0) {
                images.forEach(image => {
                    const img = document.createElement('img');
                    img.src = `/static/images/${image.filename}`;
                    img.alt = item.name;
                    img.style.maxWidth = '100px'; // Adjust as needed
                    img.style.maxHeight = '100px'; // Adjust as needed
                    imageContainer.appendChild(img);
                });
            } else {
                const img = document.createElement('img');
                img.src = 'https://via.placeholder.com/80';
                img.alt = 'Placeholder';
                imageContainer.appendChild(img);
            }

            document.getElementById('item-details-quantity').textContent = `Quantity: ${item.quantity} ${item.unit}`;
            document.getElementById('item-details-date').textContent = `Date Acquired: ${item.acquired_date || 'N/A'}`;
            document.getElementById('item-details-tags').textContent = `Tags: ${item.tags || 'N/A'}`;
            document.getElementById('item-details-notes').textContent = `Notes: ${item.notes || 'N/A'}`;

            document.getElementById('items-grid').style.display = 'none';
            document.getElementById('item-details-view').style.display = 'block';
            document.getElementById('back-button').style.display = 'none';
            document.querySelector('.counts').style.display = 'none';
        })
        .catch(error => console.error('Error fetching item images:', error));
}

async function displayFolders(folders) {
    const folderGrid = document.getElementById('folder-grid');
    folderGrid.innerHTML = '';

    const sortedFolders = folders.slice().sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    for (const folder of sortedFolders) {
        if (folder.parent_id === currentFolderId || (currentFolderId === null && folder.parent_id === null)) {
            const subfolderCount = await fetch(`/folders/${folder.id}/count`).then(response => response.json());
            const itemCount = await fetch(`/folders/${folder.id}/items/count`).then(response => response.json());
            const images = await fetch(`/images/?folder_id=${folder.id}`).then(response => response.json());

            const folderCard = document.createElement('div');
            folderCard.className = 'folder-card';

            let imageUrl = 'https://via.placeholder.com/80';
            if (images && images.length > 0) {
                imageUrl = `/static/images/${images[0].filename}`;
            }

            folderCard.innerHTML = `
                <img src="${imageUrl}" alt="${folder.name}" class="thumbnail">
                <div class="folder-details">
                    <h3 class="folder-title">${folder.name}</h3>
                    <div class="folder-info">
                        ${subfolderCount > 0 ? `<i class="material-icons folder-icon">folder</i> ${subfolderCount} | ` : ''}
                        Items ${itemCount > 0 ? itemCount : 0}
                    </div>
                </div>
                <div class="folder-actions">
                    <i class="material-icons more-options-button">more_vert</i>
                    <div class="options-menu" data-folder-id="${folder.id}" style="display: none; position: absolute; background-color: #555; border: 1px solid #777; border-radius: 5px; padding: 5px;">
                        <div class="menu-item details-item">Details</div>
                        <div class="menu-item move-item">Move</div>
                        <div class="menu-item clone-item">Clone</div>
                        <div class="menu-item delete-item">Delete</div>
                    </div>
                </div>
            `;

            folderCard.addEventListener('click', (event) => {
                if (!event.target.classList.contains('more-options-button') && !event.target.classList.contains('menu-item')) {
                    currentFolderId = folder.id;
                    loadFolderView();
                }
            });

            folderGrid.appendChild(folderCard);
        }
    }
}

document.addEventListener('click', (event) => {
    const target = event.target;

    // Close any open menus if clicking outside
    if (!target.classList.contains('more-options-button') && !target.classList.contains('options-menu') && !target.classList.contains('menu-item')) {
        document.querySelectorAll('.options-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    // Toggle the specific menu when its more_vert button is clicked
    if (target.classList.contains('more-options-button')) {
        event.stopPropagation();
        const actions = target.parentNode;
        const optionsMenu = actions.querySelector('.options-menu');
        if (optionsMenu) {
            document.querySelectorAll('.options-menu').forEach(menu => {
                if (menu !== optionsMenu) {
                    menu.style.display = 'none';
                }
            });
            optionsMenu.style.display = optionsMenu.style.display === 'block' ? 'none' : 'block';
        }
    }

    // Handle menu item clicks
    if (target.classList.contains('menu-item')) {
        const menuItem = target.textContent;
        const menu = target.parentNode;
        const folderId = menu.dataset.folderId;
        const itemId = menu.dataset.itemId;
        menu.style.display = 'none';

        if (folderId) {
            // Handle folder menu items
            if (menuItem === 'Details') {
                console.log(`Folder Details clicked for folder ID: ${folderId}`);
                // Implement folder details display
            } else if (menuItem === 'Move') {
                console.log(`Folder Move clicked for folder ID: ${folderId}`);
                // Implement folder move functionality
            } else if (menuItem === 'Clone') {
                console.log(`Folder Clone clicked for folder ID: ${folderId}`);
                fetch(`/folders/${folderId}/clone`, { method: 'POST' })
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Failed to clone folder.');
                        }
                    })
                    .then(data => {
                        console.log(`Folder ID: ${folderId} cloned. New folder ID: ${data.new_folder_id}`);
                        loadFolderView(); // Reload the folder view to reflect the changes
                    })
                    .catch(error => {
                        console.error('Error cloning folder:', error);
                        alert('Failed to clone folder. Please try again.');
                    });
            } else if (menuItem === 'Delete') {
                // Fetch the folder's name before displaying the confirmation
                fetch(`/folders/${folderId}`)
                    .then(response => response.json())
                    .then(folder => {
                        if (confirm(`Are you sure you want to delete folder: "${folder.name}" and all its contents?`)) {
                            fetch(`/folders/${folderId}`, { method: 'DELETE' })
                                .then(response => {
                                    if (response.ok) {
                                        console.log(`Folder ID: ${folderId} deleted successfully.`);
                                        loadFolderView();
                                    } else {
                                        throw new Error('Failed to delete folder.');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error deleting folder:', error);
                                    alert('Failed to delete folder. Please try again.');
                                });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching folder details:', error);
                        alert('Failed to fetch folder details. Please try again.');
                    });
            }
        } else if (itemId) {
            // Handle item menu items
            if (menuItem === 'Details') {
                console.log(`Item Details clicked for item ID: ${itemId}`);
                displayItemDetails(items.find(item => item.id === parseInt(itemId)));
            } else if (menuItem === 'Move') {
                console.log(`Item Move clicked for item ID: ${itemId}`);
                // Implement item move functionality
            } else if (menuItem === 'Clone') {
                console.log(`Item Clone clicked for item ID: ${itemId}`);
                fetch(`/items/${itemId}/clone`, { method: 'POST' })
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Failed to clone item.');
                        }
                    })
                    .then(data => {
                        console.log(`Item ID: ${itemId} cloned. New item ID: ${data.id}`);
                        loadFolderView(); // Refresh the view
                    })
                    .catch(error => {
                        console.error('Error cloning item:', error);
                        alert('Failed to clone item. Please try again.');
                    });
            } else if (menuItem === 'Delete') {
                // Fetch the item's name before displaying the confirmation
                fetch(`/items/${itemId}`)
                    .then(response => response.json())
                    .then(item => {
                        if (confirm(`Are you sure you want to delete item: "${item.name}"?`)) {
                            fetch(`/items/${itemId}`, { method: 'DELETE' })
                                .then(response => {
                                    if (response.ok) {
                                        console.log(`Item ID: ${itemId} deleted successfully.`);
                                        loadFolderView();
                                    } else {
                                        throw new Error('Failed to delete item.');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error deleting item:', error);
                                    alert('Failed to delete item. Please try again.');
                                });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching item details:', error);
                        alert('Failed to fetch item details. Please try again.');
                    });
            }
        }
    }
});

function loadRootView() {
    currentFolderId = null;
    document.getElementById('back-button').style.display = 'none';
    document.getElementById('home-button').style.display = 'none'; // Hide home button on root
    document.getElementById('header-title').textContent = "HomeOrg";

    Promise.all([
        fetch('/folders/').then(response => response.json()),
        fetch('/items/').then(response => response.json())
    ])
        .then(([folders, items]) => { // Corrected: folders is now the direct response
            displayFolders(folders); // Pass folders directly
            displayItems(items);

            // Calculate total quantity from items, as the root folder no longer supplies this value.
            let totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            updateCounts(totalQuantity);
            document.getElementById('total-quantity').textContent = totalQuantity;
        })
        .catch(error => console.error('Error loading root view:', error));
}

function loadFolderView() {
    if (currentFolderId === null) {
        // If currentFolderId is null, load the root view instead
        loadRootView();
        return;
    }
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-button').style.display = 'block'; // Show home button when in a folder

    fetch(`/folders/${currentFolderId}`)
        .then(response => response.json())
        .then(folder => {
            document.getElementById('header-title').textContent = folder.name; // Ensure this line exists

            Promise.all([
                fetch(`/folders/${currentFolderId}/folders`).then(response => response.json()),
                fetch(`/folders/${currentFolderId}/items`).then(response => response.json()),
                fetch(`/folders/${currentFolderId}/quantity`).then(response => response.json())
            ])
                .then(([subFolders, items, quantityData]) => {
                    document.getElementById('folder-grid').innerHTML = '';
                    document.getElementById('item-grid').innerHTML = '';
                    displayFolders(subFolders);
                    displayItems(items);
                    updateCounts(quantityData.quantity);
                })
                .catch(error => console.error(`Error loading folder view for ${currentFolderId}:`, error));
        })
        .catch(error => console.error(`Error fetching folder details for ${currentFolderId}:`, error));
}

document.getElementById('back-button').addEventListener('click', () => {
    if (currentFolderId) {
        fetch(`/folders/${currentFolderId}/parent`)
            .then(response => response.json())
            .then(data => {
                if (data) {
                    currentFolderId = data.id;
                    loadFolderView();
                } else {
                    loadRootView();
                }
            })
            .catch(error => console.error(`Error fetching parent folder for ${currentFolderId}:`, error));
    }
});

// New event listener for the home button
document.getElementById('home-button').addEventListener('click', () => {
    loadRootView(); // Call loadRootView to go to the root level
});

window.addEventListener('scroll', () => {
    const fab = document.getElementById('add-item-fab');
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 50) { // Adjust '50' as needed
        fab.style.display = 'none';
    } else {
        fab.style.display = 'block';
    }
});

loadRootView(); // Load root view on page load