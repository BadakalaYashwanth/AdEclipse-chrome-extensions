document.addEventListener('DOMContentLoaded', () => {
    const whitelistTextarea = document.getElementById('whitelist');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get('whitelist', (data) => {
        whitelistTextarea.value = data.whitelist || '';
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const whitelist = whitelistTextarea.value;

        // Basic validation or cleanup could happen here
        // For now, we save raw strings but they are parsed in background.js

        chrome.storage.sync.set({ whitelist: whitelist }, () => {
            if (chrome.runtime.lastError) {
                status.textContent = "Error saving settings.";
                status.style.color = "red";
                status.classList.add('visible');
            } else {
                // Update dynamic rules immediately via messaging or just rely on background listener if it exists?
                // The current background.js listens for storage changes?
                // Actually, background.js creates context menus and toggle logic. 
                // We should probably explicitly ask background to reload rules if we want instant effect 
                // without waiting for specific triggers. 
                // However, background.js writes to storage in 'whitelistSite', so it shares the same source of truth.
                // Improving: Let's trigger an update.

                // For this scope, simply saving is enough as background.js reads from storage when needed. 
                // But a direct "reload" might be better. 
                // Let's keep it simple: Save to storage.

                // Show success message
                status.textContent = "Settings saved!";
                status.style.color = "#4CAF50";
                status.classList.add('visible');

                setTimeout(() => {
                    status.classList.remove('visible');
                }, 2000);
            }
        });
    });
});
