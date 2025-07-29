// /static/script.js
let currentFolderId = null; // Track the current folder ID
let allItems = []; // Store all items for easy lookup

// Get modal elements
const addEditModal = document.getElementById('add-edit-modal');
const closeModalButton = document.querySelector('.close-button');
const fab = document.getElementById('add-item-fab');
const modalTitle = document.getElementById('modal-title');

// Get tab elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Get form elements for Folder
const addFolderForm = document.getElementById('add-folder-form');
const modalFolderName = document.getElementById('modalFolderName');
const modalFolderDescription = document.getElementById('modalFolderDescription');
const modalFolderNotes = document.getElementById('modalFolderNotes');
const modalFolderTags = document.getElementById('modalFolderTags');
const modalFolderImageUrl = document.getElementById('modalFolderImageUrl'); // This will be replaced by file input for folders
const modalFolderParentId = document.getElementById('modalFolderParentId');

// Get form elements for Item
const addItemForm = document.getElementById('add-item-form');
const modalItemName = document.getElementById('modalItemName');
const modalItemDescription = document.getElementById('modalItemDescription');
const modalItemQuantity = document.getElementById('modalItemQuantity');
const modalItemUnit = document.getElementById('modalItemUnit');
const modalItemTags = document.getElementById('modalItemTags');
const modalItemAcquiredDate = document.getElementById('modalItemAcquiredDate');
const modalItemNotes = document.getElementById('modalItemNotes');
const modalItemImageUrl = document.getElementById('modalItemImageUrl'); // This will be replaced by file input for items
const modalItemFolderId = document.getElementById('modalItemFolderId');
const modalItemImageFile = document.getElementById('modalItemImageFile'); // NEW: File input for item image


// Custom Message Box and Confirmation Dialog
let confirmActionResolve = null; // To store the resolve function for the promise

function showMessage(message, isError = false) {
    const messageBox = document.getElementById('messageBox');
    // Create if not exists (for cases where it might be removed or not in initial HTML)
    if (!messageBox) {
        const body = document.querySelector('body');
        const newMessageBox = document.createElement('div');
        newMessageBox.id = 'messageBox';
        newMessageBox.className = 'message-box';
        body.appendChild(newMessageBox);
        messageBox = newMessageBox;
    }

    messageBox.textContent = message;
    if (isError) {
        messageBox.classList.add('error');
    } else {
        messageBox.classList.remove('error');
    }
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000); // Hide after 3 seconds
}

function showConfirm(message) {
    return new Promise((resolve) => {
        const confirmBox = document.getElementById('confirmBox');
        // Create if not exists
        if (!confirmBox) {
            const body = document.querySelector('body');
            const newConfirmBox = document.createElement('div');
            newConfirmBox.id = 'confirmBox';
            newConfirmBox.className = 'message-box'; // Reusing message-box styles
            newConfirmBox.style.backgroundColor = '#ffc107'; // Yellow for warning
            newConfirmBox.style.color = '#333';
            newConfirmBox.innerHTML = `
                <p id="confirmMessage"></p>
                <div class="mt-3 flex justify-end space-x-2">
                    <button class="btn btn-secondary" id="confirmNo">No</button>
                    <button class="btn btn-primary" id="confirmYes">Yes</button>
                </div>
            `;
            body.appendChild(newConfirmBox);
            confirmBox = newConfirmBox;
        }

        document.getElementById('confirmMessage').textContent = message;
        confirmBox.style.display = 'block';

        const confirmYesBtn = document.getElementById('confirmYes');
        const confirmNoBtn = document.getElementById('confirmNo');

        // Clear previous listeners to prevent multiple calls
        confirmYesBtn.onclick = null;
        confirmNoBtn.onclick = null;

        confirmYesBtn.onclick = () => {
            confirmBox.style.display = 'none';
            resolve(true);
        };
        confirmNoBtn.onclick = () => {
            confirmBox.style.display = 'none';
            resolve(false);
        };
    });
}


async function updateCounts() {
    try {
        const countsResponse = await fetch('/counts/');
        const countsData = await countsResponse.json();
        document.getElementById('folder-count').textContent = countsData.total_folders;
        document.getElementById('item-count').textContent = countsData.total_items;
        document.getElementById('total-quantity').textContent = countsData.total_quantity;
    } catch (error) {
        console.error('Error fetching counts:', error);
        showMessage('Failed to fetch counts.', true);
    }
}

async function displayItems(items) {
    const itemGrid = document.getElementById('item-grid');
    itemGrid.innerHTML = ''; // Clear previous items

    // Filter items based on currentFolderId
    const filteredItems = items.filter(item => {
        if (currentFolderId === null) {
            return item.folder_id === null; // Show root items
        } else {
            return item.folder_id === currentFolderId; // Show items in current folder
        }
    });

    for (const item of filteredItems) {
        // Fetch images for the item
        const images = await fetch(`/images/?item_id=${item.id}`).then(response => response.json());

        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';

        let imageUrl = 'https://placehold.co/80x80/cccccc/333333?text=No+Image'; // Placeholder if no image
        if (images && images.length > 0) {
            // Use /static_images/ path for image files
            imageUrl = `/static_images/${images[0].filename}`;
        }

        itemCard.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="thumbnail">
            <div class="item-details">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-info">
                    ${item.quantity || 0} ${item.unit || ''}
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

document.getElementById('item-details-back-button').addEventListener('click', () => {
    document.getElementById('item-details-view').style.display = 'none';
    document.getElementById('items-grid').style.display = 'flex'; // Ensure grid is flex
    document.querySelector('.counts').style.display = 'flex'; // Show the counts div as flex
    if (currentFolderId) {
        document.getElementById('back-button').style.display = 'block';
    } else {
        document.getElementById('home-button').style.display = 'none'; // Hide home button on root
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
    imageContainer.innerHTML = ''; // Clear previous images

    try {
        const response = await fetch(`/images/?item_id=${item.id}`);
        const images = await response.json();

        if (images && images.length > 0) {
            images.forEach(image => {
                // Use /static_images/ path for image files
                const img = document.createElement('img');
                img.src = `/static_images/${image.filename}`;
                img.alt = item.name;
                img.onerror = () => { img.src = 'https://placehold.co/150x150/cccccc/333333?text=Error'; }; // Fallback
                imageContainer.appendChild(img);
            });
        } else {
            const img = document.createElement('img');
            img.src = 'https://placehold.co/150x150/cccccc/333333?text=No+Image';
            img.alt = 'Placeholder';
            imageContainer.appendChild(img);
        }
    } catch (error) {
        console.error('Error fetching item images:', error);
        const img = document.createElement('img');
        img.src = 'https://placehold.co/150x150/cccccc/333333?text=Error+Loading';
        img.alt = 'Error Loading Image';
        imageContainer.appendChild(img);
    }

    document.getElementById('items-grid').style.display = 'none';
    document.getElementById('item-details-view').style.display = 'block';
    document.getElementById('back-button').style.display = 'none';
    document.querySelector('.counts').style.display = 'none';
}

async function displayFolders(folders) {
    const folderGrid = document.getElementById('folder-grid');
    folderGrid.innerHTML = ''; // Clear previous folders

    const sortedFolders = folders.slice().sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    for (const folder of sortedFolders) {
        // Corrected: Call specific endpoints for subfolder and item counts
        const subfolderCountData = await fetch(`/folders/${folder.id}/subfolders/count`).then(response => response.json());
        const itemCountData = await fetch(`/folders/${folder.id}/items/count`).then(response => response.json());
        
        const subfolderCount = subfolderCountData.subfolder_count;
        const itemCount = itemCountData.item_count;

        const images = await fetch(`/images/?folder_id=${folder.id}`).then(response => response.json());

        const folderCard = document.createElement('div');
        folderCard.className = 'folder-card';

        let imageUrl = 'https://placehold.co/80x80/cccccc/333333?text=No+Image'; // Placeholder if no image
        if (images && images.length > 0) {
            // Use /static_images/ path for image files
            imageUrl = `/static_images/${images[0].filename}`;
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

document.addEventListener('click', async (event) => {
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
                // Implement folder details display if needed, or just navigate into it
                currentFolderId = parseInt(folderId);
                loadFolderView();
            } else if (menuItem === 'Move') {
                console.log(`Folder Move clicked for folder ID: ${folderId}`);
                const newParentIdInput = prompt("Enter new parent folder ID (leave empty for root):");
                let newParentId = newParentIdInput ? parseInt(newParentIdInput) : null;
                if (newParentIdInput !== null && newParentIdInput !== '' && isNaN(newParentId)) {
                    showMessage("Invalid parent ID. Please enter a number or leave empty.", true);
                    return;
                }
                try {
                    const response = await fetch(`/folders/${folderId}/move?new_parent_id=${newParentId || ''}`, {
                        method: 'PATCH', // Changed to PATCH as per API
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showMessage(data.message);
                        loadFolderView();
                    } else {
                        showMessage(`Error moving folder: ${data.detail || response.statusText}`, true);
                    }
                } catch (error) {
                    console.error('Error moving folder:', error);
                    showMessage('Failed to move folder.', true);
                }
            } else if (menuItem === 'Clone') {
                console.log(`Folder Clone clicked for folder ID: ${folderId}`);
                try {
                    const response = await fetch(`/folders/${folderId}/clone`, { method: 'POST' });
                    const data = await response.json();
                    if (response.ok) {
                        showMessage(`Folder "${data.name}" cloned successfully! New ID: ${data.id}`);
                        loadFolderView(); // Reload the folder view to reflect the changes
                    } else {
                        showMessage(`Error cloning folder: ${data.detail || response.statusText}`, true);
                    }
                } catch (error) {
                    console.error('Error cloning folder:', error);
                    showMessage('Failed to clone folder. Please try again.', true);
                }
            } else if (menuItem === 'Delete') {
                const folderResponse = await fetch(`/folders/${folderId}`);
                const folder = await folderResponse.json();
                const confirmed = await showConfirm(`Are you sure you want to delete folder: "${folder.name}" and all its contents? This action cannot be undone.`);
                if (confirmed) {
                    try {
                        const response = await fetch(`/folders/${folderId}`, { method: 'DELETE' });
                        const data = await response.json();
                        if (response.ok) {
                            showMessage(data.message);
                            loadFolderView();
                        } else {
                            showMessage(`Error deleting folder: ${data.detail || response.statusText}`, true);
                        }
                    } catch (error) {
                        console.error('Error deleting folder:', error);
                        showMessage('Failed to delete folder.', true);
                    }
                }
            }
        } else if (itemId) {
            // Handle item menu items
            const item = allItems.find(i => i.id === parseInt(itemId)); // Find the item from the cached list
            if (!item) {
                showMessage("Item not found.", true);
                return;
            }

            if (menuItem === 'Details') {
                console.log(`Item Details clicked for item ID: ${itemId}`);
                displayItemDetails(item);
            } else if (menuItem === 'Move') {
                console.log(`Item Move clicked for item ID: ${itemId}`);
                const newFolderIdInput = prompt("Enter new folder ID (leave empty for root):");
                let newFolderId = newFolderIdInput ? parseInt(newFolderIdInput) : null;
                if (newFolderIdInput !== null && newFolderIdInput !== '' && isNaN(newFolderId)) {
                    showMessage("Invalid folder ID. Please enter a number or leave empty.", true);
                    return;
                }
                try {
                    const response = await fetch(`/items/${itemId}/move?new_folder_id=${newFolderId || ''}`, {
                        method: 'PATCH', // Changed to PATCH as per API
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showMessage(data.message);
                        loadFolderView();
                    } else {
                        showMessage(`Error moving item: ${data.detail || response.statusText}`, true);
                    }
                } catch (error) {
                    console.error('Error moving item:', error);
                    showMessage('Failed to move item.', true);
                }
            } else if (menuItem === 'Clone') {
                console.log(`Item Clone clicked for item ID: ${itemId}`);
                try {
                    const response = await fetch(`/items/${itemId}/clone`, { method: 'POST' });
                    const data = await response.json();
                    if (response.ok) {
                        showMessage(`Item "${data.name}" cloned successfully! New ID: ${data.id}`);
                        loadFolderView(); // Refresh the view
                    } else {
                        showMessage(`Error cloning item: ${data.detail || response.statusText}`, true);
                    }
                } catch (error) {
                    console.error('Error cloning item:', error);
                    showMessage('Failed to clone item. Please try again.', true);
                }
            } else if (menuItem === 'Delete') {
                const confirmed = await showConfirm(`Are you sure you want to delete item: "${item.name}"?`);
                if (confirmed) {
                    try {
                        const response = await fetch(`/items/${itemId}`, { method: 'DELETE' });
                        const data = await response.json();
                        if (response.ok) {
                            showMessage(`Item "${data.name}" deleted successfully.`);
                            loadFolderView();
                        } else {
                            showMessage(`Error deleting item: ${data.detail || response.statusText}`, true);
                        }
                    } catch (error) {
                        console.error('Error deleting item:', error);
                        showMessage('Failed to delete item.', true);
                    }
                }
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
        fetch('/folders/').then(response => response.json()), // Fetch root folders
        fetch('/items/').then(response => response.json())    // Fetch all items
    ])
    .then(([folders, items]) => {
        allItems = items; // Cache all items
        displayFolders(folders);
        displayItems(items);
        updateCounts(); // Update counts based on all data
    })
    .catch(error => {
        console.error('Error loading root view:', error);
        showMessage('Failed to load root view. Please check the server.', true);
    });
}

async function loadFolderView() {
    if (currentFolderId === null) {
        loadRootView();
        return;
    }

    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-button').style.display = 'block'; // Show home button when in a folder

    try {
        const folderResponse = await fetch(`/folders/${currentFolderId}`);
        if (!folderResponse.ok) {
            throw new Error(`Folder with ID ${currentFolderId} not found.`);
        }
        const folder = await folderResponse.json();
        document.getElementById('header-title').textContent = folder.name;

        const [subFolders, items, quantityData] = await Promise.all([
            fetch(`/folders/${currentFolderId}/folders`).then(response => response.json()),
            fetch(`/folders/${currentFolderId}/items`).then(response => response.json()),
            fetch(`/folders/${currentFolderId}/quantity`).then(response => response.json())
        ]);

        allItems = items; // Update cached items for the current view
        document.getElementById('folder-grid').innerHTML = '';
        document.getElementById('item-grid').innerHTML = '';
        displayFolders(subFolders);
        displayItems(items);
        document.getElementById('total-quantity').textContent = quantityData.quantity; // Update total quantity for current folder
        updateCounts(); // Refresh overall counts
    } catch (error) {
        console.error(`Error loading folder view for ${currentFolderId}:`, error);
        showMessage(`Failed to load folder view. ${error.message}`, true);
        // Fallback to root view if folder not found or error
        loadRootView();
    }
}

document.getElementById('back-button').addEventListener('click', async () => {
    if (currentFolderId) {
        try {
            const response = await fetch(`/folders/${currentFolderId}/parent`);
            const data = await response.json();
            if (data) {
                currentFolderId = data.id;
                loadFolderView();
            } else {
                loadRootView(); // Go to root if no parent
            }
        } catch (error) {
            console.error(`Error fetching parent folder for ${currentFolderId}:`, error);
            showMessage('Failed to go back. Please try again.', true);
            loadRootView(); // Fallback to root view on error
        }
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

// --- Modal and Form Handling ---

// Open modal when FAB is clicked
fab.addEventListener('click', () => {
    console.log("FAB clicked!"); // Add this line for debugging
    addEditModal.style.display = 'block';
    modalTitle.textContent = 'Add New Entry'; // Set title for add mode
    // Reset forms and show default tab (Add Folder)
    addFolderForm.reset();
    addItemForm.reset();
    // Clear any previously selected file
    if (modalItemImageFile) {
        modalItemImageFile.value = '';
    }
    // Pre-fill parent/folder ID if currently in a folder
    modalFolderParentId.value = currentFolderId || '';
    modalItemFolderId.value = currentFolderId || '';
    switchTab('add-folder-form'); // Show Add Folder tab by default
    populateUnitDropdown(); // Populate the unit dropdown
});

// Close modal when close button is clicked
closeModalButton.addEventListener('click', () => {
    addEditModal.style.display = 'none';
});

// Close modal when clicking outside of the modal content
window.addEventListener('click', (event) => {
    if (event.target == addEditModal) {
        addEditModal.style.display = 'none';
    }
});

// Tab switching logic
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        switchTab(targetTab);
    });
});

function switchTab(tabId) {
    tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabId).style.display = 'block';
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// Populate Unit dropdown
async function populateUnitDropdown() {
    // These are the units from your schemas.py
    const units = [
        "UNIT", "EACH", "BOX", "POUND", "KILOGRAM", "GRAM", "OUNCE",
        "YARD", "GALLON", "LITER", "ROLL", "PACK", "PALLET", "CASE"
    ];
    modalItemUnit.innerHTML = '<option value="">Select Unit</option>'; // Default empty option
    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        // Format for display (e.g., "UNIT" -> "Unit", "POUND" -> "Pound")
        option.textContent = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
        modalItemUnit.appendChild(option);
    });
}

// Handle Add Folder Form Submission
addFolderForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    const folderData = {
        name: modalFolderName.value,
        description: modalFolderDescription.value || null,
        notes: modalFolderNotes.value || null,
        tags: modalFolderTags.value || null,
        // image_url: modalFolderImageUrl.value || null, // Removed as we'll handle file upload separately
        parent_id: modalFolderParentId.value ? parseInt(modalFolderParentId.value) : null
    };

    try {
        const response = await fetch('/folders/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(folderData),
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(`Folder "${data.name}" created successfully! ID: ${data.id}`);
            addEditModal.style.display = 'none'; // Close modal
            loadFolderView(); // Refresh current view
        } else {
            showMessage(`Error creating folder: ${data.detail || response.statusText}`, true);
        }
    } catch (error) {
        console.error('Error creating folder:', error);
        showMessage('Failed to create folder.', true);
    }
});

// Handle Add Item Form Submission
addItemForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    const itemData = {
        name: modalItemName.value,
        description: modalItemDescription.value || null,
        quantity: modalItemQuantity.value ? parseFloat(modalItemQuantity.value) : 0.0, // Ensure float
        unit: modalItemUnit.value || null,
        tags: modalItemTags.value || null,
        acquired_date: modalItemAcquiredDate.value || null,
        notes: modalItemNotes.value || null,
        // image_url: modalItemImageUrl.value || null, // Removed as we'll handle file upload separately
        folder_id: modalItemFolderId.value ? parseInt(modalItemFolderId.value) : null
    };

    let newItemId = null;

    try {
        // 1. Create the Item record first
        const itemResponse = await fetch('/items/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData),
        });
        const itemDataResponse = await itemResponse.json();

        if (!itemResponse.ok) {
            throw new Error(`Error creating item: ${itemDataResponse.detail || itemResponse.statusText}`);
        }
        newItemId = itemDataResponse.id;
        showMessage(`Item "${itemDataResponse.name}" created successfully! ID: ${newItemId}`);

        // 2. If an image file is selected, upload it
        const imageFile = modalItemImageFile.files[0];
        if (imageFile) {
            const formData = new FormData();
            formData.append('file', imageFile);

            const imageUploadResponse = await fetch(`/items/${newItemId}/images/`, {
                method: 'POST',
                body: formData, // No 'Content-Type' header needed for FormData; browser sets it
            });
            const imageUploadData = await imageUploadResponse.json();

            if (imageUploadResponse.ok) {
                showMessage(`Image "${imageUploadData.filename}" uploaded for item ID ${newItemId}!`);
            } else {
                // Log error but don't stop the process, as item was already created
                console.error(`Error uploading image: ${imageUploadData.detail || imageUploadResponse.statusText}`);
                showMessage(`Warning: Failed to upload image for item. ${imageUploadData.detail || imageUploadResponse.statusText}`, true);
            }
        }

        addEditModal.style.display = 'none'; // Close modal
        loadFolderView(); // Refresh current view
    } catch (error) {
        console.error('Error in item creation/image upload process:', error);
        showMessage(`Failed to create item or upload image: ${error.message}`, true);
        // If item creation failed, newItemId will be null.
        // If image upload failed, the item was still created, so just show warning.
    }
});


// Initial data load on page load
window.onload = () => {
    loadRootView(); // Load root view on page load
};
