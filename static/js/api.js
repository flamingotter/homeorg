async function fetchJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch JSON from ${url}:`, error);
        throw error;
    }
}

export async function getCounts() {
    return await fetchJson('/counts/');
}

export async function getItems() {
    return await fetchJson('/items/');
}

export async function getFolders() {
    return await fetchJson('/folders/');
}

export async function getItem(id) {
    return await fetchJson(`/items/${id}`);
}

export async function getFolder(id) {
    return await fetchJson(`/folders/${id}`);
}

export async function getSubfolders(folderId) {
    return await fetchJson(`/folders/${folderId}/folders`);
}

export async function getItemsInFolder(folderId) {
    return await fetchJson(`/folders/${folderId}/items`);
}

export async function getImagesForItem(itemId) {
    return await fetchJson(`/images/?item_id=${itemId}`);
}

export async function getImagesForFolder(folderId) {
    return await fetchJson(`/images/?folder_id=${folderId}`);
}

export async function postFormData(url, formData) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to post form data to ${url}:`, error);
        throw error;
    }
}

export async function putFormData(url, formData) {
    try {
        const response = await fetch(url, {
            method: 'PUT',
            body: formData
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to put form data to ${url}:`, error);
        throw error;
    }
}