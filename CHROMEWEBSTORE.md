# Chrome Web Store Listing: YouTube Tabs to Playlist

## Store Listing Metadata

- **Name**: YouTube Tabs to Playlist
- **Summary**: Save all open YouTube tabs into any playlist, create new playlists, or launch instant watch queues.
- **Category**: Productivity
- **Language**: English

---

## Detailed Description

Collect, organize, and save all open YouTube video tabs into a playlist with one click.

Whether you have dozens of YouTube tabs open across multiple windows or want to organize your watch queue for later, YouTube Tabs to Playlist scans your browser tabs, extracts video details, and adds them directly to your YouTube playlists.

### Key Features:
- **Scan & Filter**: Automatically detects YouTube tabs (standard videos, Shorts, live streams, and youtu.be links).
- **Target Any Playlist**: Select from your existing YouTube playlists, create a new playlist on the fly, or specify a playlist ID/URL.
- **Instant YouTube Queue (Zero-Config)**: Launch a native YouTube multi-video queue instantly without configuring API keys.
- **Tab Cleanup**: Automatically close saved tabs after adding them to keep your browser organized and free up RAM.
- **Export Formats**: Copy URLs, video IDs, Markdown links, or raw JSON with one click.

---

## Permissions Justification

| Permission / Host | Plain-English Reason for Reviewers |
|-------------------|-----------------------------------|
| `tabs` | Needed to detect open YouTube tabs, read video URLs and titles to extract video IDs, and optionally close tabs after saving. |
| `storage` | Needed to store user preferences, cached playlist lists, and optional OAuth client configuration locally. |
| `identity` | Needed to authenticate with Google's YouTube Data API v3 so users can fetch and save videos to their YouTube playlists. |
| `*://*.youtube.com/*` | Needed to communicate with YouTube endpoints and extract video identifiers. |
| `https://www.googleapis.com/*` | Needed to call the YouTube Data API v3 endpoints (`playlists`, `playlistItems`, `channels`). |

---

## Privacy & Data Handling
- **No Remote Tracking**: The extension does not collect or transmit personal user data to external third-party servers.
- **Direct API**: Requests to the YouTube Data API communicate directly from the user's browser to Google's official endpoints (`https://www.googleapis.com`).
