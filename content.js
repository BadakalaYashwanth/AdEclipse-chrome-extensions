/* content.js for AdEclipse */

// Configuration
const AD_SKIP_SELECTOR = '.ytp-ad-skip-button, .ytp-ad-skip-button-modern';
const AD_OVERLAY_SELECTOR = '.ytp-ad-overlay-close-button';
const VIDEO_PLAYER_SELECTOR = 'video';
const AD_MODULE_SELECTOR = '.ytp-ad-module';

// Helper to interact with the DOM
function clickSkipButton() {
    const skipButton = document.querySelector(AD_SKIP_SELECTOR);
    if (skipButton) {
        skipButton.click();
        console.log('[AdEclipse] Skipped ad');
    }
}

function closeOverlay() {
    const overlayButton = document.querySelector(AD_OVERLAY_SELECTOR);
    if (overlayButton) {
        overlayButton.click();
        console.log('[AdEclipse] Closed overlay ad');
    }
}

function fastForwardAd() {
    const video = document.querySelector(VIDEO_PLAYER_SELECTOR);
    // Check if it's an ad (often determined by class on player or ad module visibility)
    // Simple heuristic: if the ad module is present and active
    const adModule = document.querySelector(AD_MODULE_SELECTOR);

    // Youtube specific: check if ad is playing
    if (adModule && adModule.children.length > 0) {
        if (video && !video.paused && video.duration < 300) { // Ads are usually short, but this logic can be risky.
            // Better: check for .ad-showing class on the player container
            const player = document.getElementById('movie_player');
            if (player && player.classList.contains('ad-showing')) {
                video.playbackRate = 16;
                video.muted = true;
                console.log('[AdEclipse] Fast-forwarding ad');
            }
        }
    }
}

// Observer to handle dynamic content
const observer = new MutationObserver((mutations) => {
    clickSkipButton();
    closeOverlay();
    fastForwardAd();
});

// Start observing
function init() {
    const targetNode = document.body;
    if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
        console.log('[AdEclipse] Video Ad blocker active');
    } else {
        // Retry if body not ready
        setTimeout(init, 100);
    }
}

init();
