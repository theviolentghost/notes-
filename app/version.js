async function getCachedVersion() {
    return await caches.open('notes_plus_plus_v2') 
        .then(cache => cache.match('/app/version.txt'))
        .then(response => {
            if (response) {
                return response.text();
            }
            return null; 
        })
        .catch(error => {
            console.error('Error retrieving cached version:', error);
            return null;
        });
}
async function getLastestVersion() {
    fetch(`/app/version.txt`).then(async response => {
        return await response.text();
    })
    .catch(error => {
        console.error('Error retrieving latest version:', error);
        return null;
    })
}
async function compareVersions() {
    const cachedVersion = await getCachedVersion();
    const latestVersion = await getLastestVersion();
    if (cachedVersion !== latestVersion && latestVersion) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, payload } = event.data;
                if (type === "UPDATE COMPLETED") {
                    location.reload(); // Reload the page to show the new content
                } else if (type === "UPDATE_FAILED") {
                    console.error("Update failed:", payload.error);
                }
            });

            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE VERSION',
                payload: {
                    version: latestVersion,
                }
            });
        }

    }
}
//compareVersions();
