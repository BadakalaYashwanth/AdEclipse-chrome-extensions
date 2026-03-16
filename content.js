// content.js
// Injected into YouTube pages. Detects video ads and handles them by:
//   1. Clicking the skip button if available.
//   2. Closing overlay/banner ads.
//   3. Fast-forwarding unskippable pre-roll/mid-roll ads.
// Designed for resilience against YouTube A/B tests and SPA navigation.

(() => {
    "use strict";

    // ─── Configuration ────────────────────────────────────────────────────────

    const CONFIG = {
        // Multiple selectors per target — first match wins.
        // Ordered by most-current selector first so we call the right button
        // even across YouTube's constant A/B DOM experiments.
        SELECTORS: {
            SKIP_BUTTON: [
                ".ytp-ad-skip-button-modern",
                ".ytp-ad-skip-button-container button",
                ".ytp-ad-skip-button",
                ".ytp-skip-ad-button",
                "[class*='skip-button']"
            ],
            OVERLAY_CLOSE: [
                ".ytp-ad-overlay-close-button",
                ".ytp-ad-overlay-slot .ytp-ad-overlay-close-button"
            ],
            // Pill that appears in the bottom-left when an ad is playing
            AD_BADGE: [
                ".ytp-ad-simple-ad-badge",
                ".ytp-ad-preview-text",
                ".ytp-ad-duration-remaining"
            ],
            VIDEO:  "video",
            PLAYER: "#movie_player"
        },
        // Milliseconds to throttle MutationObserver callbacks.
        THROTTLE_MS: 250,
        // Maximum playback rate during fast-forward phase. 16× is Chrome's cap.
        AD_PLAYBACK_RATE: 16,
        // Delay before restoring normal playback — prevents flicker when one
        // bumper ad immediately follows another.
        RESTORE_DELAY_MS: 600
    };

    // ─── State ────────────────────────────────────────────────────────────────

    let lastRun      = 0;
    let observer     = null;
    let isSpedUp     = false;
    let restoreTimer = null;
    let skipEnabled  = true; // Mirrors storage: youtubeSkip && enabled

    // ─── Utilities ────────────────────────────────────────────────────────────

    /** Return the first visible element matching any selector in the list. */
    function queryFirst(selectors) {
        const list = Array.isArray(selectors) ? selectors : [selectors];
        for (const sel of list) {
            const el = document.querySelector(sel);
            // offsetParent is null for hidden elements (display:none / visibility:hidden)
            if (el && el.offsetParent !== null) return el;
        }
        return null;
    }

    /** True when YouTube's player container has the 'ad-showing' class. */
    function isAdPlaying() {
        const player = document.querySelector(CONFIG.SELECTORS.PLAYER);
        if (!player) return false;
        return player.classList.contains("ad-showing") ||
               player.classList.contains("ad-interrupting");
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    function trySkip() {
        const btn = queryFirst(CONFIG.SELECTORS.SKIP_BUTTON);
        if (btn) btn.click();
    }

    function tryCloseOverlay() {
        const btn = queryFirst(CONFIG.SELECTORS.OVERLAY_CLOSE);
        if (btn) btn.click();
    }

    function tryFastForward() {
        const video = document.querySelector(CONFIG.SELECTORS.VIDEO);
        if (!video) return;

        if (isAdPlaying()) {
            if (!isSpedUp) {
                isSpedUp = true;
                video.playbackRate = CONFIG.AD_PLAYBACK_RATE;
                video.muted = true;
            }
            if (restoreTimer) {
                clearTimeout(restoreTimer);
                restoreTimer = null;
            }
        } else if (isSpedUp) {
            // Ad ended — restore with a short delay to absorb back-to-back ads.
            restoreTimer = setTimeout(() => {
                const v = document.querySelector(CONFIG.SELECTORS.VIDEO);
                if (v && !isAdPlaying()) {
                    v.playbackRate = 1;
                    v.muted        = false;
                    isSpedUp       = false;
                }
            }, CONFIG.RESTORE_DELAY_MS);
        }
    }

    // ─── Main Handler ─────────────────────────────────────────────────────────

    function handleMutations() {
        if (!skipEnabled) return;

        const now = Date.now();
        if (now - lastRun < CONFIG.THROTTLE_MS) return;
        lastRun = now;

        trySkip();
        tryCloseOverlay();
        tryFastForward();
    }

    // ─── Sync with Background State ───────────────────────────────────────────

    function syncState() {
        chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
            if (chrome.runtime.lastError || !response) return;
            skipEnabled = response.youtubeSkip !== false && response.enabled !== false;
        });
    }

    // React immediately when user toggles settings in popup
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabled || changes.youtubeSkip) syncState();
    });

    // Also accept push messages from background (faster than polling storage)
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "YOUTUBE_SKIP_CHANGED") {
            skipEnabled = message.value;
        }
    });

    // ─── Observer Lifecycle ───────────────────────────────────────────────────

    function startObserver() {
        if (observer) return; // Guard against double-init

        observer = new MutationObserver(handleMutations);
        observer.observe(document.body, {
            childList:       true,
            subtree:         true,
            attributes:      true,
            attributeFilter: ["class"] // Only watch class changes — much cheaper
        });

        // Run once immediately in case an ad is already visible
        handleMutations();
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // ─── YouTube SPA Navigation ───────────────────────────────────────────────
    // YouTube is a single-page app. Full page reloads don't happen on navigation.
    // We listen for YouTube's internal navigation event to reset state cleanly.

    document.addEventListener("yt-navigate-finish", () => {
        // Reset fast-forward state for the new page
        isSpedUp = false;
        if (restoreTimer) {
            clearTimeout(restoreTimer);
            restoreTimer = null;
        }
        // Re-sync settings in case something changed while navigating
        syncState();
        handleMutations();
    });

    // ─── Init ─────────────────────────────────────────────────────────────────

    function init() {
        syncState();
        startObserver();
    }

    // Support both fully-loaded and still-loading pages
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Clean up observer when the content-script context is invalidated
    window.addEventListener("unload", stopObserver);

})();