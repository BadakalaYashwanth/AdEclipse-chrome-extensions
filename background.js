chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "toggle-blocking",
        title: "Toggle Ad Blocking",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "whitelist-site",
        title: "Add Current Site to Whitelist",
        contexts: ["all"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "toggle-blocking") {
        toggleBlocking();
    } else if (info.menuItemId === "whitelist-site") {
        whitelistSite(tab);
    }
});

function toggleBlocking() {
    chrome.declarativeNetRequest.getEnabledRulesets((rulesetIds) => {
        if (rulesetIds.includes("ruleset_1")) {
            chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ["ruleset_1"] });
        } else {
            chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ["ruleset_1"] });
        }
    });
}

function whitelistSite(tab) {
    if (!tab || !tab.url) return;
    
    try {
        const url = new URL(tab.url);
        const domain = url.hostname;

        chrome.storage.sync.get("whitelist", (data) => {
            let whitelist = data.whitelist ? data.whitelist.split(",") : [];
            
            if (!whitelist.includes(domain)) {
                whitelist.push(domain);
                const newWhitelistStr = whitelist.join(",");
                
                chrome.storage.sync.set({ whitelist: newWhitelistStr }, () => {
                   updateDynamicRules(whitelist);
                });
            }
        });
    } catch (e) {
        console.error("Invalid URL:", tab.url);
    }
}

function updateDynamicRules(whitelist) {
    // First, get ALL current dynamic rules to remove them safely
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
        });
    });
}
