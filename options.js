// options.js
// Settings page logic.
// Saving to chrome.storage.sync automatically triggers background.js's
// storage.onChanged listener, which rebuilds dynamic whitelist rules.

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    // ─── Element References ────────────────────────────────────────────────────
    const whitelistInput = document.getElementById("whitelist-input");
    const saveBtn        = document.getElementById("save-btn");
    const clearBtn       = document.getElementById("clear-btn");
    const saveStatus     = document.getElementById("save-status");
    const resetStats     = document.getElementById("reset-stats");
    const statTotal      = document.getElementById("stat-total");
    const statWhitelist  = document.getElementById("stat-whitelist");

    // ─── Load State ───────────────────────────────────────────────────────────

    const data = await chrome.storage.sync.get(["whitelist", "blockedCount"]);
    const whitelist = Array.isArray(data.whitelist)
        ? data.whitelist
        : parseWhitelistString(data.whitelist ?? "");

    whitelistInput.value   = whitelist.join("\n");
    statTotal.textContent  = formatCount(data.blockedCount ?? 0);
    statWhitelist.textContent = String(whitelist.length);

    // ─── Save Whitelist ────────────────────────────────────────────────────────

    saveBtn.addEventListener("click", async () => {
        const raw = whitelistInput.value;
        const parsed = parseWhitelistString(raw);

        // Validate: each entry must look like a real domain (basic check)
        const invalid = parsed.filter(d => !/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(d));
        if (invalid.length > 0) {
            showStatus(`Invalid domain(s): ${invalid.slice(0, 3).join(", ")}`, "error");
            return;
        }

        try {
            await chrome.storage.sync.set({ whitelist: parsed });
            // background.js reloads dynamic rules automatically via storage.onChanged
            statWhitelist.textContent = String(parsed.length);
            showStatus("Saved! Rules updated.", "success");
        } catch (err) {
            showStatus("Save failed: " + err.message, "error");
        }
    });

    // ─── Clear All ────────────────────────────────────────────────────────────

    clearBtn.addEventListener("click", async () => {
        whitelistInput.value = "";
        await chrome.storage.sync.set({ whitelist: [] });
        statWhitelist.textContent = "0";
        showStatus("Whitelist cleared.", "success");
    });

    // ─── Reset Block Count ────────────────────────────────────────────────────

    resetStats.addEventListener("click", async () => {
        await chrome.storage.sync.set({ blockedCount: 0 });
        statTotal.textContent = "0";
        showStatus("Counter reset.", "success");
    });

    // ─── Live Character Count While Typing ────────────────────────────────────

    whitelistInput.addEventListener("input", () => {
        const count = parseWhitelistString(whitelistInput.value).length;
        statWhitelist.textContent = String(count);
    });

    // ─── Utilities ────────────────────────────────────────────────────────────

    /**
     * Parse a whitelist string that may use newlines or commas as separators.
     * Always returns a de-duplicated, lowercase, trimmed array.
     */
    function parseWhitelistString(str) {
        return [...new Set(
            str
                .split(/[\n,]+/)
                .map(d => d.trim().toLowerCase())
                .filter(d => d.length > 0)
        )];
    }

    function formatCount(n) {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
        if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
        return String(n);
    }

    function showStatus(msg, type) {
        saveStatus.textContent = msg;
        saveStatus.className = `status-msg show ${type}`;
        setTimeout(() => { saveStatus.className = "status-msg"; }, 3000);
    }

});