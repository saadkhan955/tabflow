/**
 * Tab Extractor Utility for YouTube Tabs
 */

export function extractYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    if (hostname.includes('youtube.com')) {
      if (parsedUrl.pathname === '/watch') {
        const v = parsedUrl.searchParams.get('v');
        if (v && isValidVideoId(v)) return v;
      }
      
      // Shorts URL: youtube.com/shorts/VIDEO_ID
      if (parsedUrl.pathname.startsWith('/shorts/')) {
        const parts = parsedUrl.pathname.split('/');
        const id = parts[2];
        if (id && isValidVideoId(id)) return id;
      }

      // Live URL: youtube.com/live/VIDEO_ID
      if (parsedUrl.pathname.startsWith('/live/')) {
        const parts = parsedUrl.pathname.split('/');
        const id = parts[2];
        if (id && isValidVideoId(id)) return id;
      }

      // Embed URL: youtube.com/embed/VIDEO_ID
      if (parsedUrl.pathname.startsWith('/embed/')) {
        const parts = parsedUrl.pathname.split('/');
        const id = parts[2];
        if (id && isValidVideoId(id)) return id;
      }
    }

    // Shortened URL: youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const id = parsedUrl.pathname.slice(1).split('?')[0].split('/')[0];
      if (id && isValidVideoId(id)) return id;
    }
  } catch {
    return null;
  }
  return null;
}

function isValidVideoId(id) {
  // YouTube video IDs are usually 11 characters alphanumeric plus '_' and '-'
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export function cleanYouTubeTitle(title) {
  if (!title) return 'Untitled YouTube Video';
  // Remove " - YouTube" suffix if present
  return title.replace(/\s*-\s*YouTube$/i, '').trim();
}

export function getVideoThumbnailUrl(videoId) {
  if (!videoId) return '';
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Queries tabs and finds all open YouTube video tabs
 * @param {Object} options - { currentWindowOnly: boolean }
 * @returns {Promise<Array>} List of YouTube video tab items
 */
export async function getOpenYouTubeTabs(options = { currentWindowOnly: true }) {
  const queryOptions = options.currentWindowOnly
    ? { currentWindow: true }
    : {};

  const tabs = await chrome.tabs.query(queryOptions);
  const youtubeTabs = [];

  for (const tab of tabs) {
    if (!tab.url) continue;
    const videoId = extractYouTubeVideoId(tab.url);
    if (videoId) {
      youtubeTabs.push({
        tabId: tab.id,
        windowId: tab.windowId,
        videoId,
        title: cleanYouTubeTitle(tab.title),
        url: tab.url,
        thumbnailUrl: getVideoThumbnailUrl(videoId),
        active: tab.active || false,
        favIconUrl: tab.favIconUrl || ''
      });
    }
  }

  return youtubeTabs;
}

/**
 * Builds the instant YouTube Queue / Multi-video link
 * E.g., https://www.youtube.com/watch_videos?video_ids=ID1,ID2,ID3...
 */
export function buildYouTubeQueueUrl(videoIds) {
  if (!videoIds || videoIds.length === 0) return '';
  const cleanIds = videoIds.filter(id => Boolean(id) && isValidVideoId(id));
  if (cleanIds.length === 0) return '';
  return `https://www.youtube.com/watch_videos?video_ids=${cleanIds.join(',')}`;
}
