document.getElementById('enable').addEventListener('click', () => {
    chrome.storage.sync.get('whitelist', (data) => {
        const whitelist = data.whitelist ? data.whitelist.split(',') : [];
        chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['ruleset_1'] }, () => {
            // Fix: Get ALL existing dynamic rules to remove them, avoiding ID collisions/orphans
            chrome.declarativeNetRequest.getDynamicRules((rules) => {
                const removeRuleIds = rules.map(rule => rule.id);
                const addRules = whitelist.map((url, index) => ({
                    id: index + 1,
                    priority: 1,
                    action: { type: 'allow' },
                    condition: { urlFilter: `*://${url.trim()}/*` }
                }));

                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: removeRuleIds,
                    addRules: addRules
                }, () => {
                    alert('Ad blocking enabled with whitelisting');
                });
            });
        });
    });
});

document.getElementById('disable').addEventListener('click', () => {
    chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['ruleset_1'] });
    alert('Ad blocking disabled');
});
