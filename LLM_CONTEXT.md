# TabFlow — Project Overview & LLM Context Specification

## 1. Executive Summary
**TabFlow** is a production Manifest V3 (MV3) Google Chrome Extension that solves browser tab clutter and memory exhaustion caused by hoarded YouTube tabs. It scans active YouTube video tabs across all browser windows, aggregates video metadata locally, and enables users to batch-save them to YouTube playlists, purge duplicate entries, cluster videos by genre, or launch an instant watch queue in a single tab.

- **Item ID (Chrome Web Store):** `gfdjgilpbpkooldnpghhgpfeacfllebm`
- **Store URL:** `https://chromewebstore.google.com/detail/tabflow/gfdjgilpbpkooldnpghhgpfeacfllebm`
- **Landing Page & Privacy Policy:** `https://tfy.khansaad.dev`
- **Repository:** `saadkhan955/tabflow`

---

## 2. Core Functional Pillars

1. **Batch Tab Detection & Playlist Saving:**
   - Detects all open YouTube video tabs (standard videos, Shorts, live streams, mobile links).
   - Allows users to select all or filter/search tabs by title or channel.
   - Saves selected videos into:
     - An existing user playlist (fetched via YouTube API).
     - A newly created playlist (title, description, privacy status: public/unlisted/private).
     - A manually inputted playlist ID or URL.
   - Optional setting to automatically close saved tabs after successful batch insertion to reclaim RAM.

2. **Instant Video Queue (No Auth Required):**
   - Combines selected video IDs into a single consolidated YouTube queue URL:
     `https://www.youtube.com/watch_videos?video_ids=ID1,ID2,...`
   - Opens the queue in a single tab and closes the clutter without requiring Google account authorization.

3. **Duplicate Detection & Playlist Hygiene:**
   - **Single Playlist Cleaner:** Analyzes items in an existing playlist to find and delete duplicate video occurrences.
   - **Cross-Playlist Scanner:** Scans across all user playlists to identify videos saved in multiple playlists, allowing bulk or selective deletion of redundant entries.

4. **Smart Organization & AI Summaries:**
   - Clusters videos by topics/genres (Tech & Coding, Gaming, Education, Entertainment, Music, etc.).
   - Generates 2-sentence video summaries using:
     - **Chrome Built-in AI:** Experimental Chrome Prompt API (Gemini Nano on-device).
     - **Cloud Gemini:** Google AI Studio Gemini Flash API key.
     - **Local Smart Heuristics:** Zero-cost fallback parsing description and tags.

5. **Local-First & Privacy Compliance:**
   - 100% client-side execution. Zero external databases, tracking SDKs, or third-party servers.
   - Direct communication strictly between the extension and official Google APIs (`https://www.googleapis.com/youtube/v3`).

---

## 3. Tech Stack & Architecture

- **Platform:** Google Chrome Extensions Manifest V3 (MV3).
- **Languages:** Vanilla JavaScript (ES Modules), HTML5, CSS3.
- **Styling:** Tailwind CSS v4 (compiled via `@tailwindcss/cli` to `popup/popup.css`).
- **Icons:** Lucide Icons (vendored offline in `scripts/lucide.min.js`).
- **API Integration:** YouTube Data API v3 (`channels`, `playlists`, `playlistItems`).
- **Authentication:** Google OAuth 2.0 via `chrome.identity.launchWebAuthFlow` orchestrated through the background service worker.

---

## 4. Key Files & Directory Structure

```
/Users/saadkhan/Misc/tabflow/
├── manifest.json              # MV3 configuration, permissions, icons, background worker
├── background.js              # Service worker: tab badge counter & persistent OAuth handler
├── popup/
│   ├── popup.html             # Main popup interface (Tab list, playlist selectors, settings)
│   ├── popup.js               # UI controller, state management, tab selection, DOM updates
│   └── popup.css              # Minified Tailwind CSS v4 build
├── src/
│   └── input.css              # Source Tailwind CSS styles and custom utilities
├── scripts/
│   ├── tab-extractor.js       # URL parsing & video ID regex extraction (supports /watch, /shorts, youtu.be)
│   ├── youtube-api.js         # YouTube Data API v3 client, OAuth flow, playlist mutations, AI summarizer
│   ├── lucide.min.js          # Offline Lucide icon runtime
│   └── package-extension.sh   # Production zip bundler for Chrome Web Store uploads
├── icons/                     # 16px, 32px, 48px, 128px PNG and SVG icon assets
└── CHROMEWEBSTORE.md          # Store metadata, privacy justification, and reviewer notes
```

---

## 5. Critical Engineering Nuances & Invariants

### A. OAuth 2.0 & Background Service Worker Isolation
- **The Problem:** In Chrome, extension popups close immediately when losing focus. When `chrome.identity.launchWebAuthFlow` opened the Google OAuth window, `popup.js` was destroyed, aborting token callbacks.
- **The Solution:** Authentication is delegated to `background.js` via `chrome.runtime.sendMessage({ action: 'START_AUTH' })`.
- `background.js` executes `launchWebAuthFlow`, parses both hash fragments (`#access_token=...`) and query parameters (`?access_token=...`), and saves `activeToken`, `tokenExpiry`, and `userProfile` into `chrome.storage.local`.
- `popup.js` listens to `chrome.storage.onChanged` to reactively update the UI the moment the background flow completes.

### B. Google Cloud Redirect URIs
- The Google Cloud OAuth 2.0 Client ID is `1079325521032-4hknl2lcu2936mseomrfd09j27uq8ghl.apps.googleusercontent.com` (Project: `tabflow-app-prod`).
- Authorized Redirect URIs for Chrome Web Store production:
  - `https://gfdjgilpbpkooldnpghhgpfeacfllebm.chromiumapp.org/`
  - `https://gfdjgilpbpkooldnpghhgpfeacfllebm.chromiumapp.org`

### C. Permissions & Store Review Compliance
- **`tabs`:** Required solely to inspect active browser tabs, read URLs to extract YouTube video IDs, and close saved tabs upon user consent.
- **`storage`:** Required for local preferences (theme, auto-close) and caching playlist metadata.
- **`identity`:** Required for Google OAuth 2.0 authorization to access user YouTube playlists.
- **`host_permissions`:** Restricted strictly to `*://*.youtube.com/*` and `https://www.googleapis.com/*`.

---

## 6. Common Development Commands

```bash
# Build CSS
npm run build

# Watch CSS during development
npm run watch

# Package production zip for Chrome Web Store upload
npm run package
# Outputs: tabflow-v<VERSION>.zip & tabflow.zip
```

---

## 7. Guidelines for LLMs Modifying this Codebase

1. **No External Network Calls:** Never introduce external telemetry, analytics, or remote CDNs. All scripts and icons must stay local.
2. **Preserve MV3 Lifecycle:** Do not run long-running async auth or background operations inside `popup.js`. Delegate background tasks to `background.js`.
3. **Keep Tailwind CSS Workflow Intact:** Do not write inline styles for new components if Tailwind utility classes can achieve the layout; compile using `npm run build` after editing `src/input.css` or `popup/popup.html`.
4. **Version Consistency:** When bumping versions, update both `manifest.json` and `package.json` before running `npm run package`.
