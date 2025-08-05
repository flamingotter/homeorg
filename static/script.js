// /static/script.js
let currentFolderId = null; // Track the current folder ID
let allItems = []; // Store all items for easy lookup

// --- UTILITY FUNCTIONS ---
function showMessage(message, isError = false) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = isError ? 'message-box error' : 'message-box';
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

// --- CORE DATA & DISPLAY FUNCTIONS ---
async function updateCounts() {
    try {
        const counts = await fetch('/counts/').then(res => res.json());
        document.getElementById('folder-count').textContent = counts.total_folders;
        document.getElementById('item-count').textContent = counts.total_items;
        document.getElementById('total-quantity').textContent = counts.total_quantity;
    } catch (error) {
        console.error('Error fetching counts:', error);
        showMessage('Failed to fetch counts.', true);
    }
}

async function displayItems(items) {
    const itemGrid = document.getElementById('item-grid');
    itemGrid.innerHTML = '';

    const filteredItems = items.filter(item => 
        currentFolderId === null ? item.folder_id === null : item.folder_id === currentFolderId
    );

    for (const item of filteredItems) {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        
        const images = await fetch(`/images/?item_id=${item.id}`).then(res => res.json());
        const imageUrl = (images && images.length > 0) ? `/static_images/${images[0].filename}` : 'https://placehold.co/80x80';

        itemCard.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="thumbnail">
            <div class="item-details">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-info">${item.quantity || 0} ${item.unit || ''}</div>
            </div>
            <div class="item-actions">
                <i class="material-icons more-options-button">more_vert</i>
            </div>`;

        itemCard.addEventListener('click', () => displayItemDetails(item));
        itemGrid.appendChild(itemCard);

        const moreOptionsButton = itemCard.querySelector('.more-options-button');
        moreOptionsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showOptionsMenu(event.currentTarget, 'item', item);
        });
    }
}

async function displayFolders(folders) {
    const folderGrid = document.getElementById('folder-grid');
    folderGrid.innerHTML = '';

    const sortedFolders = folders.sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of sortedFolders) {
        const folderCard = document.createElement('div');
        folderCard.className = 'folder-card';

        const [subfolderCountData, itemCountData, images] = await Promise.all([
            fetch(`/folders/${folder.id}/subfolders/count`).then(res => res.json()),
            fetch(`/folders/${folder.id}/items/count`).then(res => res.json()),
            fetch(`/images/?folder_id=${folder.id}`).then(res => res.json())
        ]);

        const imageUrl = (images && images.length > 0) ? `/static_images/${images[0].filename}` : 'https://placehold.co/80x80';

        folderCard.innerHTML = `
            <img src="${imageUrl}" alt="${folder.name}" class="thumbnail">
            <div class="folder-details">
                <h3 class="folder-title">${folder.name}</h3>
                <div class="folder-info">
                    ${subfolderCountData.subfolder_count > 0 ? `<i class="material-icons folder-icon">folder</i> ${subfolderCountData.subfolder_count} | ` : ''}
                    Items ${itemCountData.item_count > 0 ? itemCountData.item_count : 0}
                </div>
            </div>
            <div class="folder-actions">
                <i class="material-icons more-options-button">more_vert</i>
            </div>`;

        folderCard.addEventListener('click', () => {
            currentFolderId = folder.id;
            loadFolderView();
        });
        folderGrid.appendChild(folderCard);

        const moreOptionsButton = folderCard.querySelector('.more-options-button');
        moreOptionsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showOptionsMenu(event.currentTarget, 'folder', folder);
        });
    }
}

function showOptionsMenu(buttonElement, type, data) {
    closeAllMenus(); // Close any other open menus

    const menu = document.createElement('div');
    menu.className = 'options-menu';
    
    const originalMenuItems = `
        <div class="menu-item details-item">Details</div>
        <div class="menu-item move-item">Move</div>
        <div class="menu-item clone-item">Clone</div>
        <div class="menu-item delete-item">Delete</div>
    `;

    menu.innerHTML = originalMenuItems;
    buttonElement.parentElement.appendChild(menu);
    menu.style.display = 'block';

    menu.addEventListener('click', async (event) => {
        event.stopPropagation();
        const target = event.target;
        if (!target.classList.contains('menu-item')) return;

        const action = target.textContent;

        if (action === 'Delete') {
            menu.innerHTML = `
                <div class="menu-item menu-item-header">Confirm?</div>
                <div class="menu-item menu-item-confirm-yes">Yes</div>
                <div class="menu-item menu-item-confirm-no">No</div>
            `;
            return;
        }
        if (action === 'No') {
            menu.innerHTML = originalMenuItems;
            return;
        }
        if (action === 'Yes') {
            // Perform Delete
            try {
                const url = type === 'item' ? `/items/${data.id}` : `/folders/${data.id}`;
                const response = await fetch(url, { method: 'DELETE' });
                if (response.ok) {
                    showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`);
                    loadFolderView(); // Refresh view
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                    showMessage(`Error: ${error.detail}`, true);
                }
            } catch (err) {
                showMessage('Deletion failed.', true);
            }
            closeAllMenus();
            return;
        }

        // Handle other actions
        if (action === 'Details') {
            if (type === 'item') displayItemDetails(data);
            else { currentFolderId = data.id; loadFolderView(); }
        }
        // Add logic for Move, Clone etc. here

        closeAllMenus();
    });
}

function closeAllMenus() {
    document.querySelectorAll('.options-menu').forEach(menu => menu.remove());
}

// --- VIEW & NAVIGATION LOGIC ---
function loadRootView() {
    currentFolderId = null;
    document.getElementById('back-button').style.display = 'none';
    document.getElementById('home-button').style.display = 'none';
    document.getElementById('header-title').textContent = "HomeOrg";

    Promise.all([
        fetch('/folders/').then(res => res.json()),
        fetch('/items/').then(res => res.json())
    ])
    .then(([folders, items]) => {
        allItems = items;
        displayFolders(folders.filter(f => f.parent_id === null));
        displayItems(items);
        updateCounts();
    })
    .catch(error => {
        console.error('Error loading root view:', error);
        showMessage('Failed to load root view.', true);
    });
}

async function loadFolderView() {
    if (currentFolderId === null) {
        loadRootView();
        return;
    }

    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-button').style.display = 'block';

    try {
        const folder = await fetch(`/folders/${currentFolderId}`).then(res => res.json());
        document.getElementById('header-title').textContent = folder.name;

        const [subFolders, itemsInFolder] = await Promise.all([
            fetch(`/folders/${currentFolderId}/folders`).then(res => res.json()),
            fetch(`/folders/${currentFolderId}/items`).then(res => res.json())
        ]);

        fetch('/items/').then(res => res.json()).then(items => allItems = items);

        displayFolders(subFolders);
        displayItems(itemsInFolder);
        updateCounts();

    } catch (error) {
        console.error(`Error loading folder view for ${currentFolderId}:`, error);
        showMessage('Failed to load folder view.', true);
        loadRootView();
    }
}

// --- INITIALIZATION & GLOBAL LISTENERS ---
document.addEventListener('DOMContentLoaded', loadRootView);
document.addEventListener('click', (event) => {
    // Close menus if clicking anywhere else on the page
    if (!event.target.closest('.options-menu') && !event.target.classList.contains('more-options-button')) {
        closeAllMenus();
    }
});

async function displayItemDetails(item) {
    document.getElementById('item-details-title').textContent = item.name;
    document.getElementById('item-details-description').textContent = item.description || 'N/A';
    document.getElementById('item-details-quantity').textContent = `${item.quantity || 0} ${item.unit || ''}`;
    document.getElementById('item-details-date').textContent = item.acquired_date || 'N/A';
    document.getElementById('item-details-tags').textContent = item.tags || 'N/A';
    document.getElementById('item-details-notes').textContent = item.notes || 'N/A';

    const imageContainer = document.getElementById('item-details-image-container');
    imageContainer.innerHTML = '';

    try {
        const images = await fetch(`/images/?item_id=${item.id}`).then(res => res.json());
        if (images && images.length > 0) {
            images.forEach(image => {
                const img = document.createElement('img');
                img.src = `/static_images/${image.filename}`;
                img.alt = item.name;
                imageContainer.appendChild(img);
            });
        } else {
            imageContainer.innerHTML = '<img src="https://placehold.co/150x150/cccccc/333333?text=No+Image" alt="Placeholder">';
        }
    } catch (error) {
        console.error('Error fetching item images:', error);
        imageContainer.innerHTML = '<img src="https://placehold.co/150x150/cccccc/333333?text=Error" alt="Error">';
    }

    document.getElementById('items-grid').style.display = 'none';
    document.getElementById('item-details-view').style.display = 'block';
    document.getElementById('back-button').style.display = 'none';
    document.querySelector('.counts').style.display = 'none';
}

document.getElementById('back-button').addEventListener('click', async () => {
    if (currentFolderId) {
        try {
            const response = await fetch(`/folders/${currentFolderId}/parent`);
            if (response.ok) {
                const data = await response.json();
                currentFolderId = data ? data.id : null;
            } else {
                currentFolderId = null;
            }
            loadFolderView();
        } catch (error) {
            console.error('Error going back:', error);
            loadRootView();
        }
    }
});

document.getElementById('home-button').addEventListener('click', loadRootView);

// ... (rest of the file for modal handling, etc.)
