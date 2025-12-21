// background.js

const RULESET_ID = "ruleset_1";

/**
 * Initializes the extension on installation.
 */
chrome.runtime.onInstalled.addListener(() => {
    // Create Context Menus
    chrome.contextMenus.create({
        id: "toggle-blocking",
        title: "Toggle Ad Blocking",
        contexts: ["all"]
    }, () => {
        if (chrome.runtime.lastError) {
            console.warn("Context menu creation warning:", chrome.runtime.lastError.message);
        }
    });

    chrome.contextMenus.create({
        id: "whitelist-site",
        title: "Add Current Site to Whitelist",
        contexts: ["all"]
    }, () => {
        if (chrome.runtime.lastError) {
            console.warn("Context menu creation warning:", chrome.runtime.lastError.message);
        }
    });
});

/**
 * Handles Context Menu Clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "toggle-blocking") {
        toggleBlocking();
    } else if (info.menuItemId === "whitelist-site") {
        whitelistSite(tab);
    }
});

/**
 * Toggles the main ad blocking ruleset.
 */
function toggleBlocking() {
    chrome.declarativeNetRequest.getEnabledRulesets((rulesetIds) => {
        if (chrome.runtime.lastError) return;

        if (rulesetIds.includes(RULESET_ID)) {
            chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [RULESET_ID] });
        } else {
            chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [RULESET_ID] });
        }
    });
}

/**
 * Whitelists the domain of the current tab.
 * @param {chrome.tabs.Tab} tab 
 */
function whitelistSite(tab) {
    if (!tab || !tab.url) return;

    try {
        const url = new URL(tab.url);
        // We whitelist the hostname. 
        const domain = url.hostname;

        // Avoid whitelisting empty or invalid domains
        if (!domain) return;

        chrome.storage.sync.get("whitelist", (data) => {
            if (chrome.runtime.lastError) return;

            let whitelist = data.whitelist ? data.whitelist.split(",") : [];
            /* Filter out empty strings just in case */
            whitelist = whitelist.filter(d => d.trim().length > 0);

            if (!whitelist.includes(domain)) {
                whitelist.push(domain);
                const newWhitelistStr = whitelist.join(",");

                chrome.storage.sync.set({ whitelist: newWhitelistStr }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Failed to save whitelist:", chrome.runtime.lastError);
                        return;
                    }
                    updateDynamicRules(whitelist);
                });
            }
        });
    } catch (e) {
        // Ignore invalid URLs (e.g. chrome:// pages)
    }
}

/**
 * Updates dynamic rules based on the whitelist.
 * @param {string[]} whitelist 
 */
function updateDynamicRules(whitelist) {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
        if (chrome.runtime.lastError) {
            console.error("Error fetching dynamic rules:", chrome.runtime.lastError);
            return;
        }

        const removeRuleIds = rules.map(rule => rule.id);

        // Create allow rules for each whitelisted domain
        const addRules = whitelist.map((domain, index) => ({
            id: index + 1,
            priority: 1,
            action: { type: 'allow' },
            condition: { urlFilter: `*://${domain.trim()}/*` }
        }));

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: addRules
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error updating dynamic rules:", chrome.runtime.lastError);
            }
        });
    });
}
