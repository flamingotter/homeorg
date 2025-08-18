import { getImagesForItem, getImagesForFolder, getSubfolders, getItemsInFolder, getFolder, getItem, getFolders } from './api.js';

export function showMessage(message, isError = false) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = isError ? 'message-box error' : 'message-box';
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

export async function displayItems(items, currentFolderId, onViewRefresh, onMove) {
    const itemGrid = document.getElementById('item-grid');
    itemGrid.innerHTML = '';

    const filteredItems = items.filter(item =>
        currentFolderId === null ? item.folder_id === null : item.folder_id === currentFolderId
    );

    for (const item of filteredItems) {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';

        const images = await getImagesForItem(item.id);
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

        itemCard.addEventListener('click', () => showDetails('item', item.id, onViewRefresh));
        itemGrid.appendChild(itemCard);

        const moreOptionsButton = itemCard.querySelector('.more-options-button');
        moreOptionsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showOptionsMenu(event.currentTarget, 'item', item, onViewRefresh, onMove);
        });
    }
}

export async function displayFolders(folders, onFolderClick, onViewRefresh, onMove) {
    const folderGrid = document.getElementById('folder-grid');
    folderGrid.innerHTML = '';

    const sortedFolders = folders.sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of sortedFolders) {
        const folderCard = document.createElement('div');
        folderCard.className = 'folder-card';

        const [subfolderCountData, itemCountData, images] = await Promise.all([
            getSubfolders(folder.id).then(res => ({ subfolder_count: res.length })),
            getItemsInFolder(folder.id).then(res => ({ item_count: res.length })),
            getImagesForFolder(folder.id)
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
            onFolderClick(folder.id);
        });
        folderGrid.appendChild(folderCard);

        const moreOptionsButton = folderCard.querySelector('.more-options-button');
        moreOptionsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            showOptionsMenu(event.currentTarget, 'folder', folder, onViewRefresh, onMove);
        });
    }
}

function showOptionsMenu(buttonElement, type, data, onViewRefresh, onMove) {
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
                    onViewRefresh(); // Refresh view
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
                    onViewRefresh(); // Refresh view
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
            showDetails(type, data.id, onViewRefresh);
        }

        if (action === 'Move') {
            onMove(type, data);
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

export function showMainGrid(currentFolderId) {
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

export async function showDetails(type, id, onViewRefresh) {
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
        const data = type === 'item' ? await getItem(id) : await getFolder(id);
        const images = type === 'item' ? await getImagesForItem(id) : await getImagesForFolder(id);

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
        showMainGrid(onViewRefresh);
    }
}

export function switchModalTab(tabId) {
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');

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

export function openAddModal(type, currentFolderId) {
    const addEditModal = document.getElementById('add-edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const addFolderForm = document.getElementById('add-folder-form');
    const addItemForm = document.getElementById('add-item-form');

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
        document.getElementById('modalItemUnit').value = 'Each (Ea)';
        document.getElementById('modalItemAcquiredDate').value = new Date().toISOString().split('T')[0];
    } else if (type === 'folder') {
        switchModalTab('add-folder-form');
        modalTitle.textContent = 'Add New Folder';
    }
}

export function closeAddEditModal() {
    const addEditModal = document.getElementById('add-edit-modal');
    addEditModal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

async function populateFolderDropdown(elementId, selectedId = null) {
    const dropdown = document.getElementById(elementId);
    if (!dropdown) return;
    dropdown.innerHTML = ''; // Clear existing options

    try {
        const folders = await getFolders();

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
            const prefix = '  '.repeat(level);
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

export function openFolderSelectionModal(onSelect) {
    document.getElementById('folder-selection-modal').style.display = 'block';
    loadFolderTree(onSelect);
}

export function closeFolderSelectionModal() {
    document.getElementById('folder-selection-modal').style.display = 'none';
    document.getElementById('folder-tree-container').innerHTML = '';
}

async function loadFolderTree(onSelect) {
    const folderTreeContainer = document.getElementById('folder-tree-container');
    folderTreeContainer.innerHTML = '<div class="loading">Loading folders...</div>';

    try {
        const folders = await getFolders();
        folderTreeContainer.innerHTML = '';

        const rootOption = document.createElement('div');
        rootOption.className = 'folder-node root-node';
        rootOption.textContent = 'Root Folder (No Parent)';
        rootOption.dataset.folderId = 'null';
        rootOption.addEventListener('click', () => {
            selectFolderNode(null, rootOption, onSelect);
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
        rootFolders.forEach(f => renderFolderNode(f, folderTreeContainer, 0, foldersById, onSelect));

    } catch (error) {
        console.error('Error loading folder tree:', error);
        showMessage('Failed to load folders for selection.', true);
        folderTreeContainer.innerHTML = '<div class="error">Failed to load folders.</div>';
    }
}

function renderFolderNode(folder, parentElement, level, foldersById, onSelect) {
    const folderNode = document.createElement('div');
    folderNode.className = 'folder-node';
    folderNode.dataset.folderId = folder.id;
    folderNode.style.paddingLeft = `${level * 20}px`;

    const folderName = document.createElement('span');
    folderName.textContent = folder.name;
    folderNode.appendChild(folderName);

    folderNode.addEventListener('click', (event) => {
        event.stopPropagation();
        selectFolderNode(folder.id, folderNode, onSelect);
    });

    parentElement.appendChild(folderNode);

    const children = foldersById[folder.id]?.children || [];
    children.sort((a, b) => a.name.localeCompare(b.name));
    children.forEach(child => renderFolderNode(child, parentElement, level + 1, foldersById, onSelect));
}

function selectFolderNode(folderId, element, onSelect) {
    const previouslySelected = document.querySelector('.folder-node.selected');
    if (previouslySelected) {
        previouslySelected.classList.remove('selected');
    }
    if (element) {
        element.classList.add('selected');
    }
    onSelect(folderId);
}

export function handleFileSelection(inputId, nameDisplayId) {
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