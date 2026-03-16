// popup.js
// Controls the extension popup UI.
// Reads state from the background service worker via messaging,
// and writes changes back through the same bus.

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    // ─── Element References ────────────────────────────────────────────────────
    const statusBanner      = document.getElementById("status-banner");
    const statusIndicator   = document.getElementById("status-indicator");
    const statusLabel       = document.getElementById("status-label");
    const blockedCount      = document.getElementById("blocked-count");
    const whitelistCount    = document.getElementById("whitelist-count");
    const toggleEnabled     = document.getElementById("toggle-enabled");
    const toggleEnabledDesc = document.getElementById("toggle-enabled-desc");
    const toggleYoutube     = document.getElementById("toggle-youtube");
    const toggleTrackers    = document.getElementById("toggle-trackers");
    const settingsBtn       = document.getElementById("settings-btn");
    const whitelistBtn      = document.getElementById("whitelist-btn");
    const reportBtn         = document.getElementById("report-btn");

    // ─── Load State ───────────────────────────────────────────────────────────

    let state = {};
    try {
        state = await sendMessage({ type: "GET_STATE" });
    } catch {
        // Background may be cold-starting; fall back to storage
        state = await chrome.storage.sync.get([
            "enabled", "youtubeSkip", "blockTrackers", "whitelist", "blockedCount"
        ]);
    }

    applyState(state);

    // ─── Render ───────────────────────────────────────────────────────────────

    function applyState(s) {
        const enabled = s.enabled !== false;
        const wlList  = Array.isArray(s.whitelist) ? s.whitelist : [];

        toggleEnabled.checked  = enabled;
        toggleYoutube.checked  = s.youtubeSkip   !== false;
        toggleTrackers.checked = s.blockTrackers  !== false;

        blockedCount.textContent   = formatCount(s.blockedCount ?? 0);
        whitelistCount.textContent = String(wlList.length);

        updateStatusUI(enabled);
    }

    function updateStatusUI(enabled) {
        if (enabled) {
            statusBanner.className    = "status-banner active";
            statusIndicator.className = "status-indicator";
            statusLabel.textContent   = "Protection Active";
            toggleEnabledDesc.textContent = "All ad blocking enabled";
        } else {
            statusBanner.className    = "status-banner paused";
            statusIndicator.className = "status-indicator paused";
            statusLabel.textContent   = "Protection Paused";
            toggleEnabledDesc.textContent = "Click to re-enable blocking";
        }
    }

    function formatCount(n) {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
        if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
        return String(n);
    }

    // ─── Toggle Handlers ──────────────────────────────────────────────────────

    toggleEnabled.addEventListener("change", async () => {
        const value = toggleEnabled.checked;
        updateStatusUI(value);
        await sendMessage({ type: "SET_ENABLED", value });
    });

    toggleYoutube.addEventListener("change", async () => {
        await sendMessage({ type: "SET_YOUTUBE_SKIP", value: toggleYoutube.checked });
    });

    toggleTrackers.addEventListener("change", async () => {
        await sendMessage({ type: "SET_BLOCK_TRACKERS", value: toggleTrackers.checked });
    });

    // ─── Button Handlers ──────────────────────────────────────────────────────

    settingsBtn.addEventListener("click", () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL("options.html"));
        }
    });

    whitelistBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) return;

        let domain;
        try { domain = new URL(tab.url).hostname; } catch { return; }

        // Delegate to background so both popup and context-menu share logic
        await sendMessage({ type: "WHITELIST_CURRENT_TAB" });

        // Optimistically refresh whitelist count
        const data = await chrome.storage.sync.get("whitelist");
        const wl = Array.isArray(data.whitelist) ? data.whitelist : [];
        whitelistCount.textContent = String(wl.length);

        whitelistBtn.textContent = domain + " whitelisted ✓";
        setTimeout(() => { whitelistBtn.textContent = "✦ Whitelist Site"; }, 2500);
    });

    reportBtn.addEventListener("click", () => {
        chrome.tabs.create({
            url: "https://github.com/BadakalaYashwanth/AdEclipse-ads-Block-chrome-extensions/issues/new"
        });
    });

    // ─── Utility ──────────────────────────────────────────────────────────────

    function sendMessage(msg) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(msg, (response) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(response);
            });
        });
    }

});