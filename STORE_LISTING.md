# Chrome Web Store Listing for AdEclipse

## Extension Name
AdEclipse - Ad Blocker & YouTube Ad Skipper

## Short Description (132 chars max)
Block ads across the web and automatically skip YouTube pre-roll ads. Fast, private, and open source.

## Detailed Description

Take control of your browsing with AdEclipse.

AdEclipse is a lightweight ad blocker built on Chrome's Manifest V3 platform. It blocks ad requests at the network level before they load, and automatically handles YouTube video ads so you never have to click Skip yourself.

Key Features:

Ad Blocking. 80+ rules covering major ad networks including DoubleClick, Google Ad Services, AppNexus, Criteo, Taboola, Outbrain, and more. Blocks banner ads, pop-unders, and injected ad scripts.

YouTube Ad Skipper. Detects skippable pre-roll ads and clicks skip automatically. For unskippable ads, the content script fast-forwards the ad at maximum playback speed. Works on YouTube's single-page navigation.

Tracker Blocking. Optional ruleset that stops 20+ analytics and tracking scripts, including Google Analytics, Hotjar, Mixpanel, Amplitude, FullStory, and Microsoft Clarity.

Whitelist Management. Add any domain to your whitelist from the popup, the options page, or the right-click context menu. Whitelist rules apply instantly without restarting the browser.

Privacy First. AdEclipse runs entirely on your device. Nothing is sent to any server. Settings sync only via your own Chrome storage.

Open Source. The full source code is on GitHub. Audit it yourself.

Version 2.0.0 Updates:
- Expanded blocklist from 5 rules to 80+ rules across three rulesets.
- Fixed a bug where saving the options page whitelist did not update blocking rules.
- Added tracker blocking as an optional toggle.
- Improved YouTube ad detection with multiple fallback selectors.
- Rebuilt popup with per-feature toggles.
- Added context script sync with background state.
- Properly restores video playback speed after ads end.

Limitations to know before installing:
AdEclipse has a smaller blocklist than uBlock Origin. If you need maximum ad coverage across every site, uBlock Origin is the better choice. AdEclipse is designed to be simple, auditable, and easy to understand.

## Category
Productivity

## Privacy Policy
AdEclipse does not collect, store, or transmit any personal user data. All ad-blocking logic runs locally using Chrome's declarativeNetRequest API. User settings including the whitelist are stored in chrome.storage.sync, which is controlled entirely by your Chrome account. No data is sent to any third-party server.