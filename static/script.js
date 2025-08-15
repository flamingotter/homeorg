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
        const imageUrl = (images && images.length > 0) ? `/static_images/${images[0].filename}` : 'https://placehold.co/60x60';

        let displayUnit = item.unit || '';
        const match = displayUnit.match(/\(([^)]+)\)/);
        if (match) {
            displayUnit = match[1];
        }

        itemCard.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="thumbnail">
            <div class="item-details">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-info">${item.quantity || 0} ${displayUnit}</div>
            </div>
            <div class="item-actions">
                <i class="material-icons more-options-button">more_vert</i>
            </div>`;

        itemCard.addEventListener('click', () => showDetails('item', item.id));
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

        const imageUrl = (images && images.length > 0) ? `/static_images/${images[0].filename}` : 'https://placehold.co/60x60';

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
    document.getElementById('add-item-fab').style.display = 'none';

    const menu = document.createElement('div');
    menu.className = 'options-menu';
    
    const originalMenuItems = `
        <div class="menu-item details-item">Details</div>
        <div class="menu-item move-item">Move</div>
        <div class="menu-item clone-item">Clone</div>
        <div class="menu-item delete-item">Delete</div>
    `;

    menu.innerHTML = originalMenuItems;
    buttonElement.closest('.item-card, .folder-card').appendChild(menu);
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
                    options.headers = { 'Content-Type': 'application/json' };
                    options.body = JSON.stringify({ new_folder_id: data.folder_id });
                } else { // type === 'folder'
                    url = `/folders/${data.id}/clone`;
                    options.headers = { 'Content-Type': 'application/json' };
                    options.body = JSON.stringify({ new_parent_id: data.parent_id });
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

        if (action === 'Details') {
            showDetails(type, data.id);
        }

        if (action === 'Move') {
            openFolderSelectionModal(type, data);
            closeAllMenus();
            return;
        }

        closeAllMenus();
    });
}

function closeAllMenus() {
    document.querySelectorAll('.options-menu').forEach(menu => menu.remove());
    document.getElementById('add-item-fab').style.display = 'flex';
}

// --- VIEW & NAVIGATION LOGIC ---
function showMainGrid() {
    document.getElementById('items-grid').style.display = 'flex';
    document.getElementById('details-view').style.display = 'none';
    document.getElementById('add-edit-modal').style.display = 'none';
    document.querySelector('.counts').style.display = 'flex';
    document.getElementById('add-item-fab').style.display = 'flex';
    if (currentFolderId === null) {
        document.getElementById('back-button').style.display = 'none';
        document.getElementById('home-button').style.display = 'none';
    } else {
        document.getElementById('back-button').style.display = 'block';
        document.getElementById('home-button').style.display = 'block';
    }
}

function loadRootView() {
    currentFolderId = null;
    document.getElementById('header-title').textContent = "HomeOrg";
    showMainGrid();

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
    showMainGrid();

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

async function populateFolderDropdown(elementId, selectedId = null) {
    const dropdown = document.getElementById(elementId);
    if (!dropdown) return;
    dropdown.innerHTML = ''; // Clear existing options

    try {
        const response = await fetch('/folders/');
        if (!response.ok) throw new Error('Failed to fetch folders');
        const folders = await response.json();

        const foldersById = folders.reduce((acc, f) => {
            acc[f.id] = { ...f, children: [] };
            return acc;
        }, {});

        const rootFolders = [];
        folders.forEach(f => {
            if (f.parent_id && foldersById[f.parent_id]) {
                foldersById[f.parent_id].children.push(foldersById[f.id]);
            } else if (f.parent_id === null) {
                rootFolders.push(foldersById[f.id]);
            }
        });

        dropdown.add(new Option('-- Root --', ''));

        function addOptions(folder, level) {
            const prefix = '  '.repeat(level);
            const option = new Option(`${prefix}${folder.name}`, folder.id);
            dropdown.add(option);

            const children = foldersById[folder.id]?.children || [];
            children.sort((a, b) => a.name.localeCompare(b.name));
            children.forEach(child => addOptions(child, level + 1));
        }

        rootFolders.sort((a, b) => a.name.localeCompare(b.name));
        rootFolders.forEach(f => addOptions(f, 0));

        if (selectedId) {
            dropdown.value = selectedId;
        }

    } catch (error) {
        console.error(`Failed to populate dropdown ${elementId}:`, error);
        showMessage('Could not load folder list.', true);
    }
}

async function showDetails(type, id) {
    document.getElementById('items-grid').style.display = 'none';
    document.getElementById('details-view').style.display = 'block';
    document.querySelector('.counts').style.display = 'none';
    document.getElementById('add-item-fab').style.display = 'none';
    document.getElementById('back-button').style.display = 'block';
    document.getElementById('home-button').style.display = 'block';

    const itemForm = document.getElementById('item-details-form');
    const folderForm = document.getElementById('folder-details-form');
    const detailsImage = document.getElementById('details-image');

    itemForm.style.display = 'none';
    folderForm.style.display = 'none';

    try {
        const data = await fetch(`/${type}s/${id}`).then(res => res.json());
        const images = await fetch(`/images/?${type}_id=${id}`).then(res => res.json());
        
        detailsImage.src = (images && images.length > 0) ? `/static_images/${images[0].filename}` : 'https://placehold.co/400x400';
        document.getElementById('header-title').textContent = data.name;

        if (type === 'item') {
            itemForm.style.display = 'block';
            document.querySelector('#item-details-form button[type="submit"]').textContent = 'Update Item';
            document.getElementById('detailsItemId').value = data.id;
            document.getElementById('detailsItemName').value = data.name;
            document.getElementById('detailsItemDescription').value = data.description || '';
            document.getElementById('detailsItemQuantity').value = data.quantity || '';
            await populateUnitDropdown('detailsItemUnit', data.unit);
            document.getElementById('detailsItemTags').value = data.tags || '';
            document.getElementById('detailsItemAcquiredDate').value = data.acquired_date;
            document.getElementById('detailsItemNotes').value = data.notes || '';
            await populateFolderDropdown('detailsItemFolderId', data.folder_id);
        } else { // folder
            folderForm.style.display = 'block';
            document.querySelector('#folder-details-form button[type="submit"]').textContent = 'Update Folder';
            document.getElementById('detailsFolderId').value = data.id;
            document.getElementById('detailsFolderName').value = data.name;
            document.getElementById('detailsFolderDescription').value = data.description || '';
            document.getElementById('detailsFolderNotes').value = data.notes || '';
            document.getElementById('detailsFolderTags').value = data.tags || '';
            await populateFolderDropdown('detailsFolderParentId', data.parent_id);
        }
    } catch (error) {
        console.error(`Error fetching details for ${type} ${id}:`, error);
        showMessage('Failed to load details.', true);
        showMainGrid();
    }
}

// --- INITIALIZATION & GLOBAL LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    loadRootView();

    // --- MODAL HANDLING ---
    const addEditModal = document.getElementById('add-edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeAddEditModalButton = addEditModal.querySelector('.close-button');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const addFolderForm = document.getElementById('add-folder-form');
    const addItemForm = document.getElementById('add-item-form');

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
    function openAddModal(type) {
        addEditModal.style.display = 'block';
        document.body.classList.add('modal-open');
        addFolderForm.reset();
        addItemForm.reset();
        document.getElementById('selectedItemImageName').textContent = 'No file chosen';
        document.getElementById('selectedFolderImageName').textContent = 'No file chosen';

        // Populate both dropdowns
        populateFolderDropdown('modalItemFolderId', currentFolderId);
        populateFolderDropdown('modalFolderParentId', currentFolderId);
        populateUnitDropdown('modalItemUnit');

        if (type === 'item') {
            switchModalTab('add-item-form');
            modalTitle.textContent = 'Add New Item';
        } else if (type === 'folder') {
            switchModalTab('add-folder-form');
            modalTitle.textContent = 'Add New Folder';
        }
    }

    // Function to close the Add/Edit Modal
    function closeAddEditModal() {
        addEditModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // Event Listeners for Modal Close
    closeAddEditModalButton.addEventListener('click', closeAddEditModal);
    window.addEventListener('click', (event) => {
        if (event.target === addEditModal) {
            closeAddEditModal();
        }
    });

    // Handle Add Item FAB click
    document.getElementById('add-item-fab').addEventListener('click', () => openAddModal('item'));

    // Handle Folder Form Submission
    addFolderForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData();

        // Append all fields except the file inputs initially
        new FormData(form).forEach((value, key) => {
            if (key !== 'image') {
                formData.append(key, value);
            }
        });

        // Find the file that was actually selected by the user
        const cameraFile = form.querySelector('#modalFolderCameraFile').files[0];
        const chosenFile = form.querySelector('#modalFolderImageFile').files[0];

        const imageFile = cameraFile || chosenFile;

        if (imageFile) {
            formData.append('image', imageFile, imageFile.name);
        }

        try {
            const response = await fetch('/folders/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                showMessage('Folder added successfully!');
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

        const form = event.target;
        const formData = new FormData();

        // Append all fields except the file inputs initially
        new FormData(form).forEach((value, key) => {
            if (key !== 'image') {
                formData.append(key, value);
            }
        });

        // Find the file that was actually selected by the user
        const cameraFile = form.querySelector('#modalItemCameraFile').files[0];
        const chosenFile = form.querySelector('#modalItemImageFile').files[0];

        const imageFile = cameraFile || chosenFile;

        if (imageFile) {
            formData.append('image', imageFile, imageFile.name);
        }

        try {
            const response = await fetch('/items/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                showMessage('Item added successfully!');
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

    // --- IMAGE HANDLING ---
    document.getElementById('takeItemPhotoButton').addEventListener('click', () => {
        document.getElementById('modalItemCameraFile').click();
    });

    document.getElementById('chooseItemFileButton').addEventListener('click', () => {
        document.getElementById('modalItemImageFile').click();
    });

    document.getElementById('takeFolderPhotoButton').addEventListener('click', () => {
        document.getElementById('modalFolderCameraFile').click();
    });

    document.getElementById('chooseFolderFileButton').addEventListener('click', () => {
        document.getElementById('modalFolderImageFile').click();
    });

    function handleFileSelection(inputId, nameDisplayId) {
        const input = document.getElementById(inputId);
        const nameDisplay = document.getElementById(nameDisplayId);
        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                nameDisplay.textContent = input.files[0].name;
            } else {
                nameDisplay.textContent = 'No file chosen';
            }
        });
    }

    handleFileSelection('modalItemImageFile', 'selectedItemImageName');
    handleFileSelection('modalItemCameraFile', 'selectedItemImageName');
    handleFileSelection('modalFolderImageFile', 'selectedFolderImageName');
    handleFileSelection('modalFolderCameraFile', 'selectedFolderImageName');
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.options-menu') && !event.target.classList.contains('more-options-button')) {
        closeAllMenus();
    }
});

document.getElementById('back-button').addEventListener('click', async () => {
    if (document.getElementById('details-view').style.display === 'block' || document.getElementById('add-edit-modal').style.display === 'block') {
        showMainGrid();
        loadFolderView();
    } else if (currentFolderId !== null) {
        const parentFolder = await fetch(`/folders/${currentFolderId}`).then(res => res.json());
        currentFolderId = parentFolder.parent_id;
        loadFolderView();
    }
});

document.getElementById('home-button').addEventListener('click', loadRootView);

document.getElementById('item-details-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const itemId = document.getElementById('detailsItemId').value;
    const formData = new FormData(event.target);
    try {
        const response = await fetch(`/items/${itemId}`, {
            method: 'PUT',
            body: formData
        });
        if (response.ok) {
            showMessage('Item updated successfully!');
            showMainGrid();
            loadFolderView();
        } else {
            const error = await response.json();
            showMessage(`Failed to update item: ${error.detail}`, true);
        }
    } catch (error) {
        showMessage(`An error occurred: ${error.message}`, true);
    }
});

document.getElementById('folder-details-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const folderId = document.getElementById('detailsFolderId').value;
    const formData = new FormData(event.target);
    try {
        const response = await fetch(`/folders/${folderId}`, {
            method: 'PUT',
            body: formData
        });
        if (response.ok) {
            showMessage('Folder updated successfully!');
            showMainGrid();
            loadFolderView();
        } else {
            const error = await response.json();
            showMessage(`Failed to update folder: ${error.detail}`, true);
        }
    } catch (error) {
        showMessage(`An error occurred: ${error.message}`, true);
    }
});

async function populateUnitDropdown(elementId, selectedUnit = '') {
    const unitSelect = document.getElementById(elementId);
    unitSelect.innerHTML = '<option value="">Select Unit</option>';
    const units = [
        'Each (Ea)', 'Piece (Pc)', 'Unit (Un)', 'Pair (Pr)', 'Set', 'Dozen (Dz)', 'Gross (Gr)', 
        'Bag (Bg)', 'Bale', 'Barrel (Bbl)', 'Bottle (Bt)', 'Box (Bx)', 'Bundle (Bdl)', 'Can', 
        'Carton (Ct)', 'Case (Cs)', 'Crate', 'Drum', 'Jar', 'Pack (Pk)', 'Package (Pkg)', 
        'Pallet (Plt)', 'Ream', 'Roll (Rl)', 'Sack', 'Skid', 'Spool', 'Tray', 'Tube', 
        'Pound (lb)', 'Ounce (oz)', 'Gram (g)', 'Kilogram (kg)', 'Ton', 'Metric Ton (t)', 
        'Gallon (gal)', 'Quart (qt)', 'Pint (pt)', 'Fluid Ounce (fl oz)', 'Liter (L)', 'Milliliter (mL)', 
        'Cubic Foot (cu ft)', 'Cubic Meter (cu m)', 'Foot (ft)', 'Inch (in)', 'Yard (yd)', 
        'Meter (m)', 'Centimeter (cm)', 'Millimeter (mm)'
    ];
    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        unitSelect.appendChild(option);
    });
    if (selectedUnit) {
        unitSelect.value = selectedUnit;
    }
}

let currentMoveType = null;
let currentMoveData = null;
let selectedFolderId = null;

function openFolderSelectionModal(type, data) {
    currentMoveType = type;
    currentMoveData = data;
    selectedFolderId = null;
    document.getElementById('folder-selection-modal').style.display = 'block';
    loadFolderTree();
}

function closeFolderSelectionModal() {
    document.getElementById('folder-selection-modal').style.display = 'none';
    document.getElementById('folder-tree-container').innerHTML = '';
    selectedFolderId = null;
}

async function loadFolderTree() {
    const folderTreeContainer = document.getElementById('folder-tree-container');
    folderTreeContainer.innerHTML = '<div class="loading">Loading folders...</div>';

    try {
        const folders = await fetch('/folders/').then(res => res.json());
        folderTreeContainer.innerHTML = '';

        const rootOption = document.createElement('div');
        rootOption.className = 'folder-node root-node';
        rootOption.textContent = 'Root Folder (No Parent)';
        rootOption.dataset.folderId = 'null';
        rootOption.addEventListener('click', () => {
            selectFolderNode(null, rootOption);
        });
        folderTreeContainer.appendChild(rootOption);

        const foldersById = folders.reduce((acc, f) => {
            acc[f.id] = { ...f, children: [] };
            return acc;
        }, {});

        const rootFolders = [];
        folders.forEach(f => {
            if (f.parent_id && foldersById[f.parent_id]) {
                foldersById[f.parent_id].children.push(foldersById[f.id]);
            } else if (f.parent_id === null) {
                rootFolders.push(foldersById[f.id]);
            }
        });

        rootFolders.sort((a, b) => a.name.localeCompare(b.name));
        rootFolders.forEach(f => renderFolderNode(f, folderTreeContainer, 0, foldersById));

    } catch (error) {
        console.error('Error loading folder tree:', error);
        showMessage('Failed to load folders for selection.', true);
        folderTreeContainer.innerHTML = '<div class="error">Failed to load folders.</div>';
    }
}

function renderFolderNode(folder, parentElement, level, foldersById) {
    const folderNode = document.createElement('div');
    folderNode.className = 'folder-node';
    folderNode.dataset.folderId = folder.id;
    folderNode.style.paddingLeft = `${level * 20}px`;

    const folderName = document.createElement('span');
    folderName.textContent = folder.name;
    folderNode.appendChild(folderName);

    folderNode.addEventListener('click', (event) => {
        event.stopPropagation();
        selectFolderNode(folder.id, folderNode);
    });

    parentElement.appendChild(folderNode);

    const children = foldersById[folder.id]?.children || [];
    children.sort((a, b) => a.name.localeCompare(b.name));
    children.forEach(child => renderFolderNode(child, parentElement, level + 1, foldersById));
}

function selectFolderNode(folderId, element) {
    const previouslySelected = document.querySelector('.folder-node.selected');
    if (previouslySelected) {
        previouslySelected.classList.remove('selected');
    }
    if (element) {
        element.classList.add('selected');
    }
    selectedFolderId = folderId;
}

document.getElementById('close-folder-selection-modal').addEventListener('click', closeFolderSelectionModal);
window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('folder-selection-modal')) {
        closeFolderSelectionModal();
    }
});

document.getElementById('select-folder-button').addEventListener('click', async () => {
    if (selectedFolderId === undefined) {
        showMessage('Please select a destination folder.', true);
        return;
    }

    try {
        let url;
        let body;

        if (currentMoveType === 'item') {
            url = `/items/${currentMoveData.id}/move`;
            body = JSON.stringify({ new_folder_id: selectedFolderId });
        } else { // 'folder'
            url = `/folders/${currentMoveData.id}/move`;
            body = JSON.stringify({ new_parent_id: selectedFolderId });
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (response.ok) {
            showMessage(`${currentMoveType.charAt(0).toUpperCase() + currentMoveType.slice(1)} moved successfully.`);
            closeFolderSelectionModal();
            loadFolderView();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            showMessage(`Error moving: ${error.detail}`, true);
        }
    } catch (err) {
        showMessage('Move operation failed.', true);
    }
});

document.getElementById('select-root-button').addEventListener('click', async () => {
    selectedFolderId = null;
    document.getElementById('select-folder-button').click();
});

// --- SEARCH & FILTER ---
document.querySelector('.search-icon').addEventListener('click', () => {
    showMessage('Search functionality coming soon!');
});

document.querySelector('.filter-icon').addEventListener('click', () => {
    showMessage('Filter functionality coming soon!');
});
// --- END OF SCRIPT ---