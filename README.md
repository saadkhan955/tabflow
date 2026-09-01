<div align="center">

<img src="icons/icon-128.png" alt="YouTube Tabs to Playlist Logo" width="80" height="80">

# YouTube Tabs to Playlist

**A sleek, modern Manifest V3 Chrome Extension that scans all open YouTube tabs across windows, saves them into playlists, purges duplicates, and auto-organizes videos into smart AI genres.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-38bdf8.svg)](https://tailwindcss.com/)
[![Lucide Icons](https://img.shields.io/badge/Icons-Lucide-f97316.svg)](https://lucide.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Features](#key-features) • [Installation](#getting-started) • [Architecture](#architecture--tech-stack) • [Permissions](#permissions--privacy)

</div>

---

## Overview

Tabs clutter and unorganized watch queues slow down browsing and consume substantial system RAM. **YouTube Tabs to Playlist** provides a single, unified command center to:

1. **Detect & Batch Save**: Scan all active YouTube video tabs across windows and save them directly into any YouTube playlist.
2. **Clean Duplicates**: Find and remove duplicate videos within individual playlists or across your entire YouTube channel.
3. **Smart AI Organization**: Automatically categorize videos into dedicated genres (Anime & Manga, Tech, Music, Gaming, Education, Business) and generate video summaries with local on-device AI.
4. **Instant Watch Queue**: Launch a consolidated YouTube watch queue in one click without requiring authentication.

---

## Key Features

### 1. Batch Tab Detection & Saving
* **Multi-Window Scope**: Scan tabs in the active window or across all open browser windows simultaneously.
* **Instant Filtering**: Real-time search bar to filter videos by title or ID.
* **Smart Deselection**: Automatically detects which tabs are already saved in the target playlist to prevent duplicates.
* **Flexible Destination**: Add to an existing playlist, create a new playlist with privacy settings, or target via Playlist ID / URL.
* **RAM Optimizer**: Optional setting to automatically close tabs upon successful playlist import.

### 2. Duplicate Video Cleaner
* **Single Playlist Analysis**: Analyzes any playlist on your channel to identify duplicate video entries.
* **Cross-Playlist Overlap Detector**: Scans your entire YouTube account across all playlists to find multi-playlist duplicates.
* **Granular Cleanup**: Choose to keep a video in its primary playlist and delete copies from secondary playlists in 1 click, or run automated bulk cleaning.

### 3. Smart AI Categorization & Summaries
* **High-Accuracy Classification**: Prioritized detection for Anime, Manga, Tech, Music, Podcasts, Gaming, Business, and Science.
* **Auto-Split Engine**: 1-Click button to split a large mixed playlist into dedicated genre playlists.
* **AI Summary Engine**: Choose between Chrome On-Device AI (Prompt API / Gemini Nano), Google Gemini 1.5 Flash Cloud API, or offline metadata extraction.

### 4. Zero-Auth Instant Queue & Export
* **Instant Queue**: Generate a temporary watch queue URL (`youtube.com/watch_videos?video_ids=...`) to play all tabs in sequence without logging in.
* **Export Utilities**: Copy selected video links as plain URLs, Video IDs, Markdown lists, or structured JSON.

---

## Architecture & Tech Stack

* **Platform**: Google Chrome Extension (Manifest V3).
* **Styling**: Tailwind CSS v4 design system with dark mode tokens and strict 4px grid rhythm.
* **Iconography**: Lucide Icon System with automatic dynamic SVG rendering.
* **Authentication**: Chrome Identity API (`chrome.identity.launchWebAuthFlow`) via Google OAuth2.
* **APIs**: YouTube Data API v3 (`playlists`, `playlistItems`, `videos`, `channels`).
* **AI Runtime**: Chrome Built-in Prompt API (`globalThis.LanguageModel`) and Google Gemini API.

---

## Directory Structure

```text
youtube-tabs-to-playlist/
├── manifest.json              # Extension Manifest V3 configuration
├── background.js              # Background service worker
├── popup/
│   ├── popup.html             # Main popup interface
│   ├── popup.js               # Application state & event controller
│   └── popup.css              # Compiled minified Tailwind CSS
├── scripts/
│   ├── tab-extractor.js       # Chrome Tabs API parser & queue builder
│   ├── youtube-api.js         # YouTube Data API v3 client & AI categorizer
│   ├── lucide.min.js          # Standalone Lucide vector icon suite
│   └── package-extension.sh   # Production ZIP packaging script
├── src/
│   └── input.css              # Tailwind CSS v4 design tokens & base rules
├── icons/                     # Standard icon assets (16, 32, 48, 128 px)
├── promo-assets/              # Web Store promotional graphics (1280x800, 440x280, 1400x560)
├── index.html                 # Product landing page
├── privacy.html               # Privacy Policy
└── terms.html                 # Terms of Service
```

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/saadkhan955/youtube-tabs-to-playlist.git
cd youtube-tabs-to-playlist
```

### 2. Install Dependencies & Build Styles
```bash
npm install
npm run build
```

### 3. Load into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** and select the `youtube-tabs-to-playlist` folder.
4. Pin the extension to your toolbar.

---

## Development Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Compiles and minifies Tailwind CSS from `src/input.css` to `popup/popup.css`. |
| `npm run watch` | Watches `src/input.css` and auto-recompiles on change during development. |
| `npm run package` | Builds Tailwind CSS and packages a clean store-ready ZIP archive. |

---

## Permissions & Privacy

This extension adheres to the principle of least privilege:

* `tabs`: Required to detect open YouTube video URLs in active browser windows.
* `storage`: Required to cache playlist metadata, user preferences, and AI provider selections locally.
* `identity`: Required to authenticate with Google OAuth2 for YouTube Data API operations.
* `host_permissions` (`*://*.youtube.com/*`, `https://www.googleapis.com/*`): Required to interact with YouTube tabs and the YouTube Data API.

**Privacy Guarantee**: No browsing history, telemetry, or personal information is transmitted to third-party servers. All operations occur directly between your browser and the official YouTube API.

---

## License

This project is licensed under the [MIT License](LICENSE).
