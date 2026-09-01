/**
 * Background Service Worker for YouTube Tabs to Playlist
 */

import { extractYouTubeVideoId } from './scripts/tab-extractor.js';

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
