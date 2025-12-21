const RULESET_ID = "ruleset_1";

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle-blocking');
    const statusText = document.getElementById('status-text');
    const settingsBtn = document.getElementById('settings-btn');
    const reportBtn = document.getElementById('report-issue');

    // Initialize state
    updateUIState();

    // Event Listeners
    toggle.addEventListener('change', () => {
        const isEnabled = toggle.checked;
        updateBlockingState(isEnabled);
    });

    settingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    reportBtn.addEventListener('click', () => {
        // Replace with actual support URL
        window.open('https://github.com/BadakalaYashwanth/AdEclipse-ads-Block-chrome-extensions/issues');
    });

    function updateUIState() {
        chrome.declarativeNetRequest.getEnabledRulesets((rulesetIds) => {
            const isEnabled = rulesetIds.includes(RULESET_ID);
            toggle.checked = isEnabled;
            updateStatusText(isEnabled);
        });
    }

    function updateStatusText(isEnabled) {
        if (isEnabled) {
            statusText.textContent = "Active";
            statusText.style.color = "#4CAF50";
        } else {
            statusText.textContent = "Paused";
            statusText.style.color = "#FF9800";
        }
    }

    function updateBlockingState(enable) {
        if (enable) {
            // Re-enable logic: we need to ensure whitelist is respected too
            // Ideally background.js handles complex logic, but here we just toggle the ruleset
            chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [RULESET_ID] }, () => {
                updateStatusText(true);
            });
        } else {
            chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [RULESET_ID] }, () => {
                updateStatusText(false);
            });
        }
    }
});
