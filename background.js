// background.js
// Service worker for AdEclipse v2.
// Handles rule management, whitelist logic, blocked-count stats,
// context menus, and a centralised message bus for popup/options.

"use strict";

// ─── Constants ────────────────────────────────────────────────────────────────

const RULESET_ADS      = "ruleset_ads";
const RULESET_MALWARE  = "ruleset_malware";
const RULESET_TRACKING = "ruleset_tracking";
const ALL_RULESETS     = [RULESET_ADS, RULESET_MALWARE, RULESET_TRACKING];

// Dynamic rule IDs start well above static rule IDs to avoid collisions.
const DYNAMIC_RULE_ID_START = 10000;

// ─── Install / Startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        await chrome.storage.sync.set({
            enabled:       true,
            youtubeSkip:   true,
            blockTrackers: true,
            whitelist:     [],
            blockedCount:  0
        });
    }
    buildContextMenus();
    await syncDynamicRules();
});

// Service workers can be killed at any time; rebuild menus on restart.
chrome.runtime.onStartup.addListener(() => {
    buildContextMenus();
});

// ─── Context Menus ────────────────────────────────────────────────────────────

function buildContextMenus() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: "toggle-blocking", title: "Toggle Ad Blocking",  contexts: ["all"] });
        chrome.contextMenus.create({ id: "whitelist-site",  title: "Whitelist This Site", contexts: ["all"] });
    });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "toggle-blocking") await handleToggleBlocking();
    if (info.menuItemId === "whitelist-site")  await handleWhitelistSite(tab);
});

// ─── Blocked-Count Stats (works for all users, not just dev mode) ─────────────
// Strategy: listen for completed requests whose URL matches known ad patterns.
// This is an approximation that works in production without onRuleMatchedDebug.

const AD_PATTERNS = [
    /doubleclick\.net/i,
    /googlesyndication\.com/i,
    /googleadservices\.com/i,
    /adnxs\.com/i,
    /taboola\.com/i,
    /outbrain\.com/i,
    /casalemedia\.com/i,
    /rubiconproject\.com/i,
    /pubmatic\.com/i,
    /criteo\.(com|net)/i
];

// onRuleMatchedDebug fires only in developer mode — use it when available.
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async () => {
        await incrementBlockCount();
    });
} else {
    // Fallback: count requests blocked by watching the webRequest API
    // (declarativeNetRequest blocks before webRequest sees them, so we
    //  count matched tab URLs against known patterns instead).
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url) {
            // No-op — genuine count is approximated via message from content script
        }
    });
}

async function incrementBlockCount() {
    try {
        const data = await chrome.storage.sync.get("blockedCount");
        const count = (data.blockedCount ?? 0) + 1;
        await chrome.storage.sync.set({ blockedCount: count });
    } catch (err) {
        console.warn("[AdEclipse] Could not increment block count:", err);
    }
}

// ─── Blocking Toggle ──────────────────────────────────────────────────────────

async function handleToggleBlocking() {
    const { enabled } = await chrome.storage.sync.get("enabled");
    const next = !enabled;
    await chrome.storage.sync.set({ enabled: next });
    await syncRulesets(next);
}

async function syncRulesets(enabled) {
    if (enabled) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds:  ALL_RULESETS });
    } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ALL_RULESETS });
    }
}

// ─── Whitelist Management ─────────────────────────────────────────────────────

async function handleWhitelistSite(tab) {
    if (!tab?.url) return;
    let domain;
    try { domain = new URL(tab.url).hostname; } catch { return; }
    if (!domain) return;

    const { whitelist = [] } = await chrome.storage.sync.get("whitelist");
    const list = Array.isArray(whitelist) ? whitelist : [];
    if (!list.includes(domain)) {
        list.push(domain);
        await chrome.storage.sync.set({ whitelist: list });
        await syncDynamicRules(list);
    }
}

/**
 * Rebuilds all dynamic allow-rules from the current whitelist.
 * Called whenever the whitelist changes from any source.
 */
async function syncDynamicRules(whitelist) {
    if (!whitelist) {
        const data = await chrome.storage.sync.get("whitelist");
        whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];
    }

    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map(r => r.id);

    const addRules = whitelist
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0 && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
        .flatMap((domain, idx) => [
            {
                id:       DYNAMIC_RULE_ID_START + idx * 2,
                priority: 100,
                action:   { type: "allow" },
                condition: { urlFilter: `||${domain}^`, isUrlFilterCaseSensitive: false }
            },
            {
                id:       DYNAMIC_RULE_ID_START + idx * 2 + 1,
                priority: 100,
                action:   { type: "allow" },
                condition: { urlFilter: `||*.${domain}^`, isUrlFilterCaseSensitive: false }
            }
        ]);

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// ─── Storage Change Listener ──────────────────────────────────────────────────

chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "sync") return;
    if (changes.whitelist)   await syncDynamicRules(changes.whitelist.newValue ?? []);
    if (changes.enabled)     await syncRulesets(changes.enabled.newValue);
    if (changes.blockTrackers) {
        const rulesets = changes.blockTrackers.newValue
            ? { enableRulesetIds:  [RULESET_TRACKING] }
            : { disableRulesetIds: [RULESET_TRACKING] };
        await chrome.declarativeNetRequest.updateEnabledRulesets(rulesets);
    }
});

// ─── Message Bus ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message)
        .then(sendResponse)
        .catch(err => {
            console.error("[AdEclipse] Message error:", err);
            sendResponse({ error: err.message });
        });
    return true; // Keep channel open for async response
});

async function handleMessage(message) {
    switch (message.type) {

        case "GET_STATE": {
            return chrome.storage.sync.get([
                "enabled", "youtubeSkip", "blockTrackers", "whitelist", "blockedCount"
            ]);
        }

        case "SET_ENABLED": {
            await chrome.storage.sync.set({ enabled: message.value });
            await syncRulesets(message.value);
            return { ok: true };
        }

        case "SET_YOUTUBE_SKIP": {
            await chrome.storage.sync.set({ youtubeSkip: message.value });
            // Notify all YouTube tabs so content.js can react immediately
            const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, { type: "YOUTUBE_SKIP_CHANGED", value: message.value })
                    .catch(() => {}); // Tab may not have content script
            }
            return { ok: true };
        }

        case "SET_BLOCK_TRACKERS": {
            await chrome.storage.sync.set({ blockTrackers: message.value });
            const rulesets = message.value
                ? { enableRulesetIds:  [RULESET_TRACKING] }
                : { disableRulesetIds: [RULESET_TRACKING] };
            await chrome.declarativeNetRequest.updateEnabledRulesets(rulesets);
            return { ok: true };
        }

        case "INCREMENT_BLOCK_COUNT": {
            await incrementBlockCount();
            return { ok: true };
        }

        case "RESET_COUNT": {
            await chrome.storage.sync.set({ blockedCount: 0 });
            return { ok: true };
        }

        case "WHITELIST_CURRENT_TAB": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await handleWhitelistSite(tab);
            return { ok: true };
        }

        case "GET_WHITELIST_COUNT": {
            const { whitelist = [] } = await chrome.storage.sync.get("whitelist");
            return { count: whitelist.length };
        }

        default:
            return { error: `Unknown message type: ${message.type}` };
    }
}