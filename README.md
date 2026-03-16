# AdEclipse — Advanced Ad Blocker & YouTube Ad Skipper

> **Block intrusive ads, trackers, and malware — all from your browser.**  
> Lightweight · Privacy-first · Manifest V3 · Zero telemetry

---

## ✨ Features

| Feature | Description |
|---|---|
| 🚫 **Ad Blocking** | Blocks 70+ known ad networks (Google, Facebook, Amazon, Taboola, Criteo, and more) at the network level — before they even load |
| ⏩ **YouTube Ad Skipper** | Automatically clicks "Skip Ad" and fast-forwards unskippable pre-roll/mid-roll ads at 16× speed |
| 🔒 **Malware Protection** | Blocks requests to known malicious domains and phishing sites |
| 🕵️ **Tracker Blocking** | Stops fingerprinting/analytics scripts from Google Analytics, Hotjar, Mixpanel, Segment, FullStory and 20+ others |
| ⚪ **Smart Whitelist** | Support favourite creators — whitelist any site in two clicks from the popup or options page |
| 📊 **Blocked-Ad Counter** | Tracks how many ads have been blocked in this session |
| 🎛️ **Per-feature Toggles** | Turn ad blocking, YouTube skipping, and tracker blocking on/off independently |
| ↔️ **Context Menu** | Right-click any page to toggle blocking or whitelist the current site |

---

## 📂 Project Structure

```
AdEclipse-chrome-extensions/
├── manifest.json           # Extension manifest (MV3)
├── background.js           # Service worker — rule management, message bus, stats
├── content.js              # YouTube ad-skipping content script
├── popup.html              # Toolbar popup
├── popup.css               # Popup styles (dark design system)
├── popup.js                # Popup logic
├── options.html            # Full settings page
├── options.js              # Settings page logic
├── rules.json              # Static ad-blocking rules (60+ entries)
├── rules_malware.json      # Malware/phishing domain blocklist
├── rules_tracking.json     # Tracker/analytics domain blocklist (30 entries)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── docs/                   # Documentation assets
```

---

## 🛠️ Technology

- **Manifest V3** — Latest Chrome extension standard (future-proof)
- **`declarativeNetRequest` API** — Network-level blocking with no page performance cost
- **`MutationObserver`** — Efficient DOM watching for YouTube ad detection
- **`chrome.storage.sync`** — Cloud-synced user settings across devices
- **Vanilla JS / HTML / CSS** — No build step, no dependencies, zero overhead

---

## 🚀 Installation (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/BadakalaYashwanth/AdEclipse-ads-Block-chrome-extensions.git
   ```

2. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the `AdEclipse-chrome-extensions/` folder.

5. The AdEclipse icon will appear in your Chrome toolbar. Click it to open the popup.

---

## ⚙️ How It Works

### Ad Blocking
Chrome's `declarativeNetRequest` API matches outgoing requests against three rule sets before they are sent:

| Ruleset | File | Purpose |
|---|---|---|
| `ruleset_ads` | `rules.json` | Ad networks & display ad servers |
| `ruleset_malware` | `rules_malware.json` | Malware, phishing & rogue domains |
| `ruleset_tracking` | `rules_tracking.json` | Analytics, session-recording & fingerprinting |

Matching requests are **blocked at the network level** — the browser never downloads the content.

### Whitelist (Dynamic Rules)
When you whitelist a domain, the background service worker creates a pair of high-priority **allow** rules (for the domain and its subdomains) via `updateDynamicRules`. These take precedence over all block rules.

### YouTube Ad Skipping
`content.js` is injected into every YouTube page. It uses a `MutationObserver` to watch for class changes on the `#movie_player` element. When `ad-showing` is detected, it:
1. Clicks any visible skip button
2. Closes overlay/banner ads
3. Sets `video.playbackRate = 16` to fast-forward unskippable ads

It handles YouTube's SPA navigation via the `yt-navigate-finish` event, resetting state cleanly between page loads.

---

## 🔐 Privacy

- **No data collection.** AdEclipse runs entirely on your device.
- **No external requests.** Rules are bundled in the extension.
- **Settings sync** uses Chrome's built-in `storage.sync` (encrypted by your Google account) to carry preferences across devices. No third-party server is involved.
- **Permissions explained:**

| Permission | Why it's needed |
|---|---|
| `declarativeNetRequest` | Block ad/tracker/malware requests |
| `declarativeNetRequestFeedback` | Read matched rules for debug stats |
| `storage` | Save user settings and whitelist |
| `tabs` | Get the current tab's URL for whitelisting |
| `contextMenus` | Right-click menu integration |
| `activeTab` | Access the current page's domain |

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📋 Changelog

### v2.0.0
- Expanded ad-blocking rules from 5 → 60+ real ad networks
- **Created** missing `rules_tracking.json` (was referenced but didn't exist)
- Replaced placeholder malware rules with real threat domains
- Fixed `tabs` permission that was used but undeclared in manifest
- Fixed `blockedCount` stats to work in production (not just developer mode)
- Added `blockTrackers` toggle wired to `storage.onChanged` in background
- Popup → background whitelist logic centralised via `WHITELIST_CURRENT_TAB` message
- New `INCREMENT_BLOCK_COUNT` and `WHITELIST_CURRENT_TAB` message types
- Overhauled popup UI: live whitelist count, pulsing status indicator, spring-bounce toggles
- Overhauled options page: stats grid, Clear All button, live entry count
- Added push-notification from background → content script for instant YouTube skip toggle

### v1.2.0
- Initial release — YouTube ad skipping, basic ad blocking

---

## 📄 License

MIT License © 2026 Yashwanth Badakala