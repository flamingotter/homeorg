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

function displayItems(items) {
    const itemGrid = document.getElementById('item-grid');
    itemGrid.innerHTML = '';

    items.forEach(item => {
        if (item.folder_id === currentFolderId || (currentFolderId === null && item.folder_id === null)) {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';

            let imageUrl = 'https://via.placeholder.com/80'; // Default placeholder
            if (item.images && item.images.length > 0) {
                imageUrl = `/static/images/${item.images[0].filename}`; // Use the first image if available
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
                    <i class="material-icons">more_vert</i>
                </div>
            `;

            itemCard.addEventListener('click', () => {
                displayItemDetails(item);
            });

            itemGrid.appendChild(itemCard);
        }
    });
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

    if (item.images && item.images.length > 0) {
        item.images.forEach(image => {
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
    document.getElementById('item-details-date').textContent = `Date Acquired: ${item.date_acquired || 'N/A'}`;
    document.getElementById('item-details-tags').textContent = `Tags: ${item.tags || 'N/A'}`;
    document.getElementById('item-details-notes').textContent = `Notes: ${item.notes || 'N/A'}`;

    document.getElementById('items-grid').style.display = 'none';
    document.getElementById('item-details-view').style.display = 'block';
    document.getElementById('back-button').style.display = 'none';
    document.querySelector('.counts').style.display = 'none';
}

function displayFolders(folders) {
    const folderGrid = document.getElementById('folder-grid');
    folderGrid.innerHTML = '';

    const sortedFolders = folders.slice().sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    const fetchPromises = [];

    sortedFolders.forEach(folder => {
        if (folder.parent_id === currentFolderId || (currentFolderId === null && folder.parent_id === null)) {
            const subfolderCountPromise = fetch(`/folders/${folder.id}/count`).then(response => response.json());
            const itemCountPromise = fetch(`/folders/${folder.id}/items/count`).then(response => response.json());

            const allDataPromise = Promise.all([subfolderCountPromise, itemCountPromise])
                .then(([subfolderCount, itemCount]) => ({ folder, subfolderCount, itemCount }));

            fetchPromises.push(allDataPromise);
        }
    });

    Promise.all(fetchPromises)
        .then(folderDataArray => {
            folderDataArray.forEach(({ folder, subfolderCount, itemCount }) => {
                const folderCard = document.createElement('div');
                folderCard.className = 'folder-card';

                let imageUrl = 'https://via.placeholder.com/80'; // Default placeholder
                if (folder.images && folder.images.length > 0) {
                    imageUrl = `/static/images/${folder.images[0].filename}`; // Use the first image if available
                }

                let folderInfoHTML = '';
                if (subfolderCount > 0) {
                    folderInfoHTML += `<i class="material-icons folder-icon">folder</i> ${subfolderCount} | `;
                }
                folderInfoHTML += `Items ${itemCount > 0 ? itemCount : 0}`;

                folderCard.innerHTML = `
                    <img src="${imageUrl}" alt="${folder.name}" class="thumbnail">
                    <div class="folder-details">
                        <h3 class="folder-title">${folder.name}</h3>
                        <div class="folder-info">
                            ${folderInfoHTML}
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
            });
        })
        .catch(error => console.error('Error fetching folder data:', error));
}

document.addEventListener('click', (event) => {
    const target = event.target;

    // Toggle the specific menu when its more_vert button is clicked
    if (target.classList.contains('more-options-button')) {
        event.stopPropagation(); // Stop the event from bubbling
        const folderActions = target.parentNode;
        const optionsMenu = folderActions.querySelector('.options-menu');
        if (optionsMenu) {
            // Close any other open menus
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
        const folderId = target.parentNode.dataset.folderId;
        target.parentNode.style.display = 'none'; // Close the menu
    
        if (menuItem === 'Details') {
            // Implement folder details view
            console.log(`Details clicked for folder ID: ${folderId}`);
            // You'll likely want to fetch folder details and display them
        } else if (menuItem === 'Delete') {
            if (confirm(`Are you sure you want to delete folder ID: ${folderId}?`)) {
                fetch(`/folders/${folderId}`, { method: 'DELETE' })
                    .then(response => {
                        if (response.ok) {
                            console.log(`Folder ID: ${folderId} deleted successfully.`);
                            // Fetch the parent folder ID and navigate to it
                            fetch(`/folders/${folderId}/parent`)
                                .then(response => response.json())
                                .then(parent => {
                                    if (parent) {
                                        currentFolderId = parent.id;
                                        loadFolderView();
                                    } else {
                                        loadRootView();
                                    }
                                })
                                .catch(error => {
                                    console.error("Error fetching parent folder:", error);
                                    loadRootView(); // Fallback to root view if parent fetch fails
                                });
                        } else {
                            console.error('Error deleting folder:', response.status);
                            // Optionally display an error message to the user
                        }
                    })
                    .catch(error => console.error('Error deleting folder:', error));
            }
        } else if (menuItem === 'Clone') {
            fetch(`/folders/${folderId}/clone`, { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    console.log(`Folder ID: ${folderId} cloned. New folder ID: ${data.new_folder_id}`);
                    loadFolderView(); // Reload the current view
                })
                .catch(error => console.error('Error cloning folder:', error));
        } else if (menuItem === 'Move') {
            console.log(`Move clicked for folder ID: ${folderId}`);
            // You'll need to implement a UI to select the new parent folder
            // and then make an API call to update the parent_id
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
        .then(([folderData, items]) => {
            displayFolders(folderData.folders);
            displayItems(items);
            updateCounts(folderData.total_quantity); // Pass the total quantity

            // Update the total quantity display
            document.getElementById('total-quantity').textContent = folderData.total_quantity;
        })
        .catch(error => console.error('Error loading root view:', error));
}

function loadFolderView() {
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

loadRootView(); // Load root view on page load