// /static/script.js
let currentFolderId = null; // Track the current folder ID
let allItems = []; // Store all items for easy lookup
let currentView = 'grid'; // Can be 'grid' or 'item-details'

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

        if (action === 'Clone') {
            try {
                let url;
                let options = { method: 'POST' };

                if (type === 'item') {
                    url = `/items/${data.id}/clone`;
                    // Send the current folder_id as new_folder_id
                    options.headers = { 'Content-Type': 'application/json' };
                    options.body = JSON.stringify({ new_folder_id: data.folder_id });
                } else {
                    url = `/folders/${data.id}/clone`;
                }

                const response = await fetch(url, options);
                if (response.ok) {
                    showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} cloned.`);
                    loadFolderView(); // Refresh view
                } else {
                    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                    showMessage(`Error: ${error.detail}`, true);
                }
            } catch (err) {
                showMessage('Clone failed.', true);
            }
            closeAllMenus();
            return;
        }

        // Handle other actions
        if (action === 'Details') {
            if (type === 'item') displayItemDetails(data);
            else { currentFolderId = data.id; loadFolderView(); }
        }
        // Add logic for Move etc. here

        closeAllMenus();
    });
}

function closeAllMenus() {
    document.querySelectorAll('.options-menu').forEach(menu => menu.remove());
}

// --- VIEW & NAVIGATION LOGIC ---
function loadRootView() {
    currentFolderId = null;
    currentView = 'grid';
    document.getElementById('back-button').style.display = 'none';
    document.getElementById('home-button').style.display = 'none';
    document.getElementById('header-title').textContent = "HomeOrg";
    document.getElementById('items-grid').style.display = 'block';
    document.getElementById('item-details-view').style.display = 'none';
    document.querySelector('.counts').style.display = 'flex';

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
    currentView = 'grid';
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-button').style.display = 'block';
    document.getElementById('items-grid').style.display = 'block';
    document.getElementById('item-details-view').style.display = 'none';
    document.querySelector('.counts').style.display = 'flex';

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
    currentView = 'item-details';
    document.getElementById('header-title').textContent = item.name;
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
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-button').style.display = 'block';
    document.querySelector('.counts').style.display = 'none';
}

document.getElementById('back-button').addEventListener('click', async () => {
    if (currentView === 'item-details') {
        loadFolderView();
    } else if (currentFolderId) {
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

// --- MODAL HANDLING ---
const addEditModal = document.getElementById('add-edit-modal');
const modalTitle = document.getElementById('modal-title');
const closeAddEditModalButton = addEditModal.querySelector('.close-button');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const addFolderForm = document.getElementById('add-folder-form');
const addItemForm = document.getElementById('add-item-form');

let currentEditingItem = null;
let currentEditingFolder = null;

// Function to switch tabs within the modal
function switchModalTab(tabId) {
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

// Event listeners for tab buttons
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        switchModalTab(button.dataset.tab);
    });
});

// Function to open the Add/Edit Modal
function openAddEditModal(type, data = null) {
    addEditModal.style.display = 'block';
    addFolderForm.reset();
    addItemForm.reset();
    document.getElementById('modalItemImageFile').value = ''; // Clear file input
    document.getElementById('modalFolderImageFile').value = ''; // Clear file input
    document.getElementById('modalItemCameraFile').value = ''; // Clear file input
    document.getElementById('modalFolderCameraFile').value = ''; // Clear file input
    document.getElementById('selectedItemImageName').textContent = 'No file chosen';
    document.getElementById('selectedFolderImageName').textContent = 'No file chosen';


    if (type === 'item') {
        switchModalTab('add-item-form');
        if (data) {
            currentEditingItem = data;
            modalTitle.textContent = 'Edit Item';
            document.getElementById('modalItemName').value = data.name;
            document.getElementById('modalItemDescription').value = data.description || '';
            document.getElementById('modalItemQuantity').value = data.quantity || '';
            document.getElementById('modalItemUnit').value = data.unit || '';
            document.getElementById('modalItemTags').value = data.tags || '';
            document.getElementById('modalItemAcquiredDate').value = data.acquired_date || '';
            document.getElementById('modalItemNotes').value = data.notes || '';
            document.getElementById('modalItemFolderId').value = data.folder_id || '';
            // No direct image preview in modal for existing images, handled by displayItemDetails
        } else {
            currentEditingItem = null;
            modalTitle.textContent = 'Add New Item';
            document.getElementById('modalItemFolderId').value = currentFolderId || ''; // Pre-fill folder ID if in a folder
        }
    } else if (type === 'folder') {
        switchModalTab('add-folder-form');
        if (data) {
            currentEditingFolder = data;
            modalTitle.textContent = 'Edit Folder';
            document.getElementById('modalFolderName').value = data.name;
            document.getElementById('modalFolderDescription').value = data.description || '';
            document.getElementById('modalFolderNotes').value = data.notes || '';
            document.getElementById('modalFolderTags').value = data.tags || '';
            document.getElementById('modalFolderParentId').value = data.parent_id || '';
        } else {
            currentEditingFolder = null;
            modalTitle.textContent = 'Add New Folder';
            document.getElementById('modalFolderParentId').value = currentFolderId || ''; // Pre-fill parent ID if in a folder
        }
    }
}

// Function to close the Add/Edit Modal
function closeAddEditModal() {
    addEditModal.style.display = 'none';
    addFolderForm.reset();
    addItemForm.reset();
    currentEditingItem = null;
    currentEditingFolder = null;
    document.getElementById('modalItemImageFile').value = ''; // Clear file input
    document.getElementById('modalFolderImageFile').value = ''; // Clear file input
    document.getElementById('modalItemCameraFile').value = ''; // Clear file input
    document.getElementById('modalFolderCameraFile').value = ''; // Clear file input
    document.getElementById('selectedItemImageName').textContent = 'No file chosen';
    document.getElementById('selectedFolderImageName').textContent = 'No file chosen';
}

// Event Listeners for Modal Close
closeAddEditModalButton.addEventListener('click', closeAddEditModal);
window.addEventListener('click', (event) => {
    if (event.target === addEditModal) {
        closeAddEditModal();
    }
});

// Handle Add Item FAB click
document.getElementById('add-item-fab').addEventListener('click', () => openAddEditModal('item'));

// Handle Folder Form Submission
addFolderForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('modalFolderName').value);
    formData.append('description', document.getElementById('modalFolderDescription').value);
    formData.append('notes', document.getElementById('modalFolderNotes').value);
    formData.append('tags', document.getElementById('modalFolderTags').value);
    formData.append('parent_id', document.getElementById('modalFolderParentId').value || null);

    const folderImageFile = document.getElementById('modalFolderImageFile').files[0] || document.getElementById('modalFolderCameraFile').files[0];
    if (folderImageFile) {
        formData.append('image', folderImageFile);
    }

    let url = '/folders/';
    let method = 'POST';

    if (currentEditingFolder) {
        url = `/folders/${currentEditingFolder.id}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            body: formData // FormData handles Content-Type automatically
        });

        if (response.ok) {
            showMessage(`Folder ${currentEditingFolder ? 'updated' : 'added'} successfully!`);
            closeAddEditModal();
            loadFolderView();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            showMessage(`Failed to save folder: ${error.detail}`, true);
        }
    } catch (error) {
        showMessage(`An error occurred: ${error.message}`, true);
    }
});

// Handle Item Form Submission
addItemForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('modalItemName').value);
    formData.append('description', document.getElementById('modalItemDescription').value);
    formData.append('quantity', document.getElementById('modalItemQuantity').value);
    formData.append('unit', document.getElementById('modalItemUnit').value);
    formData.append('tags', document.getElementById('modalItemTags').value);
    formData.append('acquired_date', document.getElementById('modalItemAcquiredDate').value);
    formData.append('notes', document.getElementById('modalItemNotes').value);
    formData.append('folder_id', document.getElementById('modalItemFolderId').value || null);

    const itemImageFile = document.getElementById('modalItemImageFile').files[0] || document.getElementById('modalItemCameraFile').files[0];
    if (itemImageFile) {
        formData.append('image', itemImageFile);
    }

    let url = '/items/';
    let method = 'POST';

    if (currentEditingItem) {
        url = `/items/${currentEditingItem.id}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            body: formData // FormData handles Content-Type automatically
        });

        if (response.ok) {
            showMessage(`Item ${currentEditingItem ? 'updated' : 'added'} successfully!`);
            closeAddEditModal();
            loadFolderView();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            showMessage(`Failed to save item: ${error.detail}`, true);
        }
    } catch (error) {
        showMessage(`An error occurred: ${error.message}`, true);
    }
});

// Image File Input Change Listeners (for displaying selected file name)
document.getElementById('modalFolderImageFile').addEventListener('change', function() {
    document.getElementById('selectedFolderImageName').textContent = this.files.length > 0 ? this.files[0].name : 'No file chosen';
});
document.getElementById('modalFolderCameraFile').addEventListener('change', function() {
    document.getElementById('selectedFolderImageName').textContent = this.files.length > 0 ? this.files[0].name : 'No file chosen';
});
document.getElementById('modalItemImageFile').addEventListener('change', function() {
    document.getElementById('selectedItemImageName').textContent = this.files.length > 0 ? this.files[0].name : 'No file chosen';
});
document.getElementById('modalItemCameraFile').addEventListener('change', function() {
    document.getElementById('selectedItemImageName').textContent = this.files.length > 0 ? this.files[0].name : 'No file chosen';
});

// "Take Photo" and "Choose File" button listeners to trigger hidden file inputs
document.getElementById('takeFolderPhotoButton').addEventListener('click', () => {
    document.getElementById('modalFolderCameraFile').click();
});
document.getElementById('chooseFolderFileButton').addEventListener('click', () => {
    document.getElementById('modalFolderImageFile').click();
});
document.getElementById('takeItemPhotoButton').addEventListener('click', () => {
    document.getElementById('modalItemCameraFile').click();
});
document.getElementById('chooseItemFileButton').addEventListener('click', () => {
    document.getElementById('modalItemImageFile').click();
});

// Extend showOptionsMenu to include Edit functionality
const originalShowOptionsMenu = showOptionsMenu;
showOptionsMenu = (buttonElement, type, data) => {
    originalShowOptionsMenu(buttonElement, type, data); // Call the original function

    const menu = buttonElement.parentElement.querySelector('.options-menu');
    if (menu) {
        const editItem = document.createElement('div');
        editItem.className = 'menu-item edit-item';
        editItem.textContent = 'Edit';
        menu.insertBefore(editItem, menu.firstChild); // Add Edit as the first option

        editItem.addEventListener('click', (event) => {
            event.stopPropagation();
            openAddEditModal(type, data); // Use the unified modal function
            closeAllMenus();
        });
    }
};

// Populate Unit dropdown for Item Form
async function populateUnitDropdown() {
    const unitSelect = document.getElementById('modalItemUnit');
    // Clear existing options
    unitSelect.innerHTML = '<option value="">Select Unit</option>';

    // Example units - replace with API call if units are dynamic
    const units = ['pcs', 'kg', 'g', 'L', 'ml', 'box', 'pack', 'set', 'pair', 'each'];

    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        unitSelect.appendChild(option);
    });
}

// Call populateUnitDropdown when the modal is opened or on DOMContentLoaded
document.addEventListener('DOMContentLoaded', populateUnitDropdown);
addEditModal.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'opacity' && addEditModal.style.display === 'block') {
        populateUnitDropdown();
    }
});