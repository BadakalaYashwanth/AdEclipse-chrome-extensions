(() => {
    // strict mode
    "use strict";

    // Configuration
    const CONFIG = {
        SELECTORS: {
            SKIP_BUTTON: '.ytp-ad-skip-button, .ytp-ad-skip-button-modern',
            OVERLAY_CLOSE: '.ytp-ad-overlay-close-button',
            VIDEO_PLAYER: 'video',
            AD_MODULE: '.ytp-ad-module',
            PLAYER_CONTAINER: '#movie_player'
        },
        INTERVAL_MS: 500, // Check at most every 500ms
        PLAYBACK_RATE: 16,
        DEBUG: false // Set to true for development logging
    };

    let lastCheck = 0;

    // Helper: conditional logging
    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[AdEclipse]', ...args);
        }
    }

    // Action: Click the skip button
    function clickSkipButton() {
        const skipButton = document.querySelector(CONFIG.SELECTORS.SKIP_BUTTON);
        if (skipButton) {
            skipButton.click();
            log('Skipped ad');
        }
    }

    // Action: Close overlay ads
    function closeOverlay() {
        const overlayButton = document.querySelector(CONFIG.SELECTORS.OVERLAY_CLOSE);
        if (overlayButton) {
            overlayButton.click();
            log('Closed overlay ad');
        }
    }

    // Action: Fast forward video ads
    function fastForwardAd() {
        const video = document.querySelector(CONFIG.SELECTORS.VIDEO_PLAYER);
        const player = document.querySelector(CONFIG.SELECTORS.PLAYER_CONTAINER);

        if (!video || !player) return;

        // Check if the player indicates an ad is showing
        const isAdShowing = player.classList.contains('ad-showing');

        if (isAdShowing) {
             // Only adjust if not already sped up to avoid fighting with user or other scripts
            if (video.playbackRate !== CONFIG.PLAYBACK_RATE) {
                video.playbackRate = CONFIG.PLAYBACK_RATE;
                video.muted = true;
                log('Fast-forwarding ad');
            }
        }
    }

    // Main handler for mutations
    function handleMutations() {
        // Simple throttle
        const now = Date.now();
        if (now - lastCheck < CONFIG.INTERVAL_MS) return;
        lastCheck = now;

        clickSkipButton();
        closeOverlay();
        fastForwardAd();
    }

    // Initialize Observer
    function init() {
        log('Initializing AdEclipse Content Script');
        
        const targetNode = document.body;
        if (!targetNode) {
             // If body isn't ready, wait slightly and try again
            requestAnimationFrame(init);
            return;
        }

        const observer = new MutationObserver(handleMutations);
        observer.observe(targetNode, { childList: true, subtree: true });
        
        // Also run once immediately
        handleMutations();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
