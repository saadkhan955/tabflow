# Chrome Web Store Listing: TabFlow

- **Extension ID:** `gfdjgilpbpkooldnpghhgpfeacfllebm`
- **Store URL:** `https://chromewebstore.google.com/detail/tabflow/gfdjgilpbpkooldnpghhgpfeacfllebm`

---

## 1. Store Listing Details

- **Name:** TabFlow
- **Summary:** Save open YouTube tabs to playlists, clean duplicates, cluster by topic, or launch instant queues.
- **Category:** Productivity
- **Language:** English
- **Website:** `https://tfy.khansaad.dev`
- **Privacy Policy URL:** `https://tfy.khansaad.dev/privacy`

---

## 2. Detailed Description

Turn your open YouTube tabs into organized playlists in seconds.

TabFlow solves tab overload by automatically detecting open YouTube video tabs across all your browser windows and saving them directly into any YouTube playlist—or launching an instant queue in a single tab to free browser RAM.

### ⚡ Key Features:
• **Batch Save Tabs:** Detect all open YouTube video tabs (videos, Shorts, live streams) and save them to any existing playlist or create a new one instantly.
• **Instant Video Queue:** Launch a continuous YouTube queue in a single tab from your open video tabs, eliminating tab clutter without requiring API login.
• **Duplicate Video Cleaner:** Scan your YouTube playlists to detect duplicate videos and clean up repeated entries automatically.
• **Smart Topic Organization:** Categorize videos within your playlists by topic to create focused playlists for study, entertainment, or research.
• **Flexible Export:** Copy or export your selected video tabs as Markdown lists, JSON files, plain URLs, or video IDs for easy note-taking.
• **Private & Local-First:** 100% on-device processing. No external databases, zero tracking, and official Google-verified OAuth authentication.

---

## 3. Permissions Justifications (Copy & Paste for Store Reviewers)

| Permission / Host | Justification for Chrome Web Store Reviewers |
| :--- | :--- |
| **`tabs`** | Required to detect open YouTube video tabs across browser windows, extract video IDs/titles to save them into playlists, and optionally close tabs after saving to free browser memory. |
| **`storage`** | Required to store user interface preferences (theme, auto-close preference) and temporary client-side playlist caches locally on the user's device. |
| **`identity`** | Required to authenticate with the official Google YouTube Data API v3 using Google OAuth 2.0 so users can fetch and save videos to their own YouTube playlists. |
| **`*://*.youtube.com/*`** | Required to parse active YouTube tab URLs and communicate with YouTube video pages. |
| **`https://www.googleapis.com/*`** | Required to communicate directly with Google's verified YouTube Data API v3 endpoints (`playlists`, `playlistItems`, `channels`). |

---

## 4. Single-Purpose Compliance
TabFlow's single purpose is to help users organize and save their open YouTube video tabs into YouTube playlists and remove duplicate entries.
