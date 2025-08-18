import { getCounts, getItems, getFolders, postFormData, putFormData, getFolder, getSubfolders, getItemsInFolder } from './api.js';
import { displayItems, displayFolders, showMainGrid, switchModalTab, openAddModal, closeAddEditModal, handleFileSelection, showDetails, openFolderSelectionModal, closeFolderSelectionModal, showMessage } from './ui.js';

let allItems = [];
let currentFolderId = null;
let moveOperation = { type: null, data: null, selectedFolderId: null };

function handleFolderClick(folderId) {
    currentFolderId = folderId;
    loadFolderView();
}

function handleMoveClick(type, data) {
    moveOperation.type = type;
    moveOperation.data = data;
    openFolderSelectionModal(handleFolderSelected);
}

function handleFolderSelected(folderId) {
    moveOperation.selectedFolderId = folderId;
}

async function loadRootView() {
    currentFolderId = null;
    document.getElementById('header-title').textContent = "HomeOrg";
    showMainGrid(currentFolderId);

    try {
        const [folders, items] = await Promise.all([getFolders(), getItems()]);
        allItems = items;
        displayFolders(folders.filter(f => f.parent_id === null), handleFolderClick, loadFolderView, handleMoveClick);
        displayItems(items, currentFolderId, loadFolderView, handleMoveClick);
        updateCountsUI();
    } catch (error) {
        console.error('Error loading root view:', error);
        showMessage('Failed to load root view.', true);
    }
}

async function loadFolderView() {
    if (currentFolderId === null) {
        loadRootView();
        return;
    }
    showMainGrid(currentFolderId);

    try {
        const folder = await getFolder(currentFolderId);
        document.getElementById('header-title').textContent = folder.name;

        const [subFolders, itemsInFolder] = await Promise.all([
            getSubfolders(currentFolderId),
            getItemsInFolder(currentFolderId)
        ]);

        const items = await getItems();
        allItems = items;

        displayFolders(subFolders, handleFolderClick, loadFolderView, handleMoveClick);
        displayItems(itemsInFolder, currentFolderId, loadFolderView, handleMoveClick);
        updateCountsUI();

    } catch (error) {
        console.error(`Error loading folder view for ${currentFolderId}:`, error);
        showMessage('Failed to load folder view.', true);
        loadRootView();
    }
}

async function updateCountsUI() {
    try {
        const counts = await getCounts();
        document.getElementById('folder-count').textContent = counts.total_folders;
        document.getElementById('item-count').textContent = counts.total_items;
        document.getElementById('total-quantity').textContent = counts.total_quantity;
    } catch (error) {
        console.error('Error fetching counts:', error);
        showMessage('Failed to fetch counts.', true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadRootView();

    // --- MODAL HANDLING ---
    const addEditModal = document.getElementById('add-edit-modal');
    const closeAddEditModalButton = addEditModal.querySelector('.close-button');
    const tabButtons = document.querySelectorAll('.tab-button');
    const addFolderForm = document.getElementById('add-folder-form');
    const addItemForm = document.getElementById('add-item-form');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchModalTab(button.dataset.tab);
        });
    });

    closeAddEditModalButton.addEventListener('click', closeAddEditModal);
    window.addEventListener('click', (event) => {
        if (event.target === addEditModal) {
            closeAddEditModal();
        }
    });

    document.getElementById('add-item-fab').addEventListener('click', () => openAddModal('item', currentFolderId));

    async function handleFormSubmit(event, formType) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData();
        const url = formType === 'item' ? '/items/' : '/folders/';
        const successMessage = formType === 'item' ? 'Item added successfully!' : 'Folder added successfully!';
        const failureMessage = formType === 'item' ? 'Failed to save item' : 'Failed to save folder';
        const cameraFileInputId = formType === 'item' ? '#modalItemCameraFile' : '#modalFolderCameraFile';
        const imageFileInputId = formType === 'item' ? '#modalItemImageFile' : '#modalFolderImageFile';

        new FormData(form).forEach((value, key) => {
            if (key !== 'image') {
                formData.append(key, value);
            }
        });

        const cameraFile = form.querySelector(cameraFileInputId).files[0];
        const chosenFile = form.querySelector(imageFileInputId).files[0];
        const imageFile = cameraFile || chosenFile;

        if (imageFile) {
            formData.append('image', imageFile, imageFile.name);
        }

        try {
            await postFormData(url, formData);
            showMessage(successMessage);
            closeAddEditModal();
            loadFolderView();
        } catch (error) {
            showMessage(`${failureMessage}: ${error.message}`, true);
        }
    }

    addFolderForm.addEventListener('submit', (event) => handleFormSubmit(event, 'folder'));
    addItemForm.addEventListener('submit', (event) => handleFormSubmit(event, 'item'));

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

    handleFileSelection('modalItemImageFile', 'selectedItemImageName');
    handleFileSelection('modalItemCameraFile', 'selectedItemImageName');
    handleFileSelection('modalFolderImageFile', 'selectedFolderImageName');
    handleFileSelection('modalFolderCameraFile', 'selectedFolderImageName');

    const fab = document.getElementById('add-item-fab');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
            fab.style.display = 'none';
        } else {
            fab.style.display = 'flex';
        }
    });

    document.getElementById('back-button').addEventListener('click', async () => {
        if (document.getElementById('details-view').style.display === 'block' || document.getElementById('add-edit-modal').style.display === 'block') {
            showMainGrid(currentFolderId);
            loadFolderView();
        } else if (currentFolderId !== null) {
            const parentFolder = await getFolder(currentFolderId);
            currentFolderId = parentFolder.parent_id;
            loadFolderView();
        }
    });

    document.getElementById('home-button').addEventListener('click', loadRootView);
    document.getElementById('home-nav-link').addEventListener('click', loadRootView);

    document.getElementById('item-details-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const itemId = document.getElementById('detailsItemId').value;
        const formData = new FormData(event.target);
        try {
            await putFormData(`/items/${itemId}`, formData);
            showMessage('Item updated successfully!');
            showMainGrid(currentFolderId);
            loadFolderView();
        } catch (error) {
            showMessage(`Failed to update item: ${error.message}`, true);
        }
    });

    document.getElementById('folder-details-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const folderId = document.getElementById('detailsFolderId').value;
        const formData = new FormData(event.target);
        try {
            await putFormData(`/folders/${folderId}`, formData);
            showMessage('Folder updated successfully!');
            showMainGrid(currentFolderId);
            loadFolderView();
        } catch (error) {
            showMessage(`Failed to update folder: ${error.message}`, true);
        }
    });

    document.getElementById('select-folder-button').addEventListener('click', async () => {
        if (moveOperation.selectedFolderId === undefined) {
            showMessage('Please select a destination folder.', true);
            return;
        }

        try {
            let url;
            let body;

            if (moveOperation.type === 'item') {
                url = `/items/${moveOperation.data.id}/move`;
                body = JSON.stringify({ new_folder_id: moveOperation.selectedFolderId });
            } else { // 'folder'
                url = `/folders/${moveOperation.data.id}/move`;
                body = JSON.stringify({ new_parent_id: moveOperation.selectedFolderId });
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: body
            });

            if (response.ok) {
                showMessage(`${moveOperation.type.charAt(0).toUpperCase() + moveOperation.type.slice(1)} moved successfully.`);
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
        moveOperation.selectedFolderId = null;
        document.getElementById('select-folder-button').click();
    });

    document.querySelector('.search-icon').addEventListener('click', () => {
        showMessage('Search functionality coming soon!');
    });

    document.querySelector('.filter-icon').addEventListener('click', () => {
        showMessage('Filter functionality coming soon!');
    });
});