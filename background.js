/**
 * Background Service Worker for YouTube Tabs to Playlist
 */

import { extractYouTubeVideoId } from './scripts/tab-extractor.js';
import { authenticateWithWebAuthFlow, clearAuthSession, DEFAULT_CLIENT_ID } from './scripts/youtube-api.js';

// Handle background OAuth so authentication survives popup unload/reopen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'START_AUTH') {
    (async () => {
      try {
        const settings = await chrome.storage.sync.get(['customClientId']);
        const clientId = (settings.customClientId && settings.customClientId.trim()) || DEFAULT_CLIENT_ID;
        const token = await authenticateWithWebAuthFlow(clientId, message.interactive ?? true);
        sendResponse({ success: true, token });
      } catch (err) {
        console.error('Background authentication error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message?.action === 'CLEAR_AUTH') {
    clearAuthSession()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Update extension badge with YouTube tab count
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    let count = 0;

    for (const tab of tabs) {
      if (tab.url && extractYouTubeVideoId(tab.url)) {
        count++;
      }
    }

    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      await chrome.action.setTitle({
        title: `${count} YouTube video tab${count > 1 ? 's' : ''} detected`
      });
    } else {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({
        title: 'YouTube Tabs to Playlist (No YouTube tabs open)'
      });
    }
  } catch (err) {
    console.error('Error updating badge:', err);
  }
}

// Tab lifecycle listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    updateBadge();
  }
});

chrome.tabs.onRemoved.addListener(() => {
  updateBadge();
});

chrome.tabs.onCreated.addListener(() => {
  updateBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});
