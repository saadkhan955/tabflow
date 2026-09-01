/**
 * YouTube Data API v3 Client with Ultra-High-Precision Genre Classifier & Free AI Summarizer
 */

const DEFAULT_CLIENT_ID = '526923629448-g5fhoc4k2u7grpjtb11j1t4sidq3njki.apps.googleusercontent.com';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

/**
 * Retrieves the active access token based on stored settings or WebAuthFlow
 */
export async function getAccessToken(interactive = true) {
  const settings = await chrome.storage.sync.get(['customToken', 'customClientId']);
  if (settings.customToken && settings.customToken.trim()) {
    return settings.customToken.trim();
  }

  const local = await chrome.storage.local.get(['activeToken', 'tokenExpiry']);
  if (local.activeToken && local.tokenExpiry && Date.now() < local.tokenExpiry) {
    return local.activeToken;
  }

  const clientId = (settings.customClientId && settings.customClientId.trim()) || DEFAULT_CLIENT_ID;

  if (clientId) {
    return authenticateWithWebAuthFlow(clientId, interactive);
  }

  if (interactive) {
    const err = new Error('MISSING_CLIENT_ID');
    err.code = 'MISSING_CLIENT_ID';
    throw err;
  }

  return null;
}

/**
 * Standard WebAuthFlow for Google OAuth
 */
async function authenticateWithWebAuthFlow(clientId, interactive = true) {
  const redirectUri = chrome.identity.getRedirectURL();
  const scopeString = encodeURIComponent(YOUTUBE_OAUTH_SCOPES.join(' '));
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&response_type=token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scopeString}&prompt=consent`;

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive
    });

    if (!responseUrl) {
      throw new Error('Authentication flow was cancelled or returned empty.');
    }

    const url = new URL(responseUrl);
    const hash = url.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (!accessToken) {
      const error = params.get('error') || 'Access token missing in response';
      throw new Error(`Google Auth error: ${error}`);
    }

    const expiryTime = Date.now() + (parseInt(expiresIn || '3600', 10) * 1000);
    await chrome.storage.local.set({ activeToken: accessToken, tokenExpiry: expiryTime });
    return accessToken;
  } catch (err) {
    throw new Error(err.message || 'OAuth authentication failed');
  }
}

/**
 * Invalidate cached auth token / Sign Out
 */
export async function clearAuthSession() {
  const local = await chrome.storage.local.get(['activeToken']);
  if (local.activeToken) {
    try {
      await chrome.identity.removeCachedAuthToken({ token: local.activeToken });
    } catch {
      // Ignore if not found
    }
  }

  await chrome.storage.sync.remove(['customToken']);
  await chrome.storage.local.remove(['activeToken', 'tokenExpiry', 'cachedPlaylists', 'userProfile']);
}

/**
 * Generic YouTube API fetcher with error handling
 */
async function youtubeFetch(endpoint, token, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${YOUTUBE_API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || `YouTube API returned status ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.error;
    throw err;
  }

  return data;
}

/**
 * Fetch authenticated user channel information
 */
export async function fetchUserProfile(token) {
  if (!token) return null;
  try {
    const data = await youtubeFetch('/channels?part=snippet,statistics&mine=true', token);
    if (data.items && data.items.length > 0) {
      const channel = data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        avatar: channel.snippet.thumbnails?.default?.url || '',
        subscriberCount: channel.statistics?.subscriberCount || '0'
      };
    }
  } catch (err) {
    console.warn('Could not fetch user profile details:', err);
  }
  return null;
}

/**
 * Fetches all playlists owned by the authenticated user
 */
export async function fetchUserPlaylists(token) {
  if (!token) return [];
  let allPlaylists = [];
  let pageToken = '';

  do {
    const query = new URLSearchParams({
      part: 'snippet,contentDetails,status',
      mine: 'true',
      maxResults: '50'
    });
    if (pageToken) {
      query.set('pageToken', pageToken);
    }

    const data = await youtubeFetch(`/playlists?${query.toString()}`, token);
    if (data.items) {
      const mapped = data.items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        privacyStatus: item.status?.privacyStatus || 'public',
        itemCount: item.contentDetails?.itemCount || 0,
        thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
        publishedAt: item.snippet.publishedAt
      }));
      allPlaylists = allPlaylists.concat(mapped);
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  await chrome.storage.local.set({ cachedPlaylists: allPlaylists });
  return allPlaylists;
}

/**
 * Fetches all video items in a specific playlist (including duplicate instances)
 */
export async function fetchAllPlaylistItems(token, playlistId) {
  if (!token || !playlistId) return [];

  const items = [];
  let pageToken = '';

  do {
    const query = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: '50'
    });
    if (pageToken) {
      query.set('pageToken', pageToken);
    }

    const data = await youtubeFetch(`/playlistItems?${query.toString()}`, token);
    if (data.items) {
      data.items.forEach((item) => {
        const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (vId) {
          items.push({
            playlistItemId: item.id,
            videoId: vId,
            title: item.snippet.title || 'Untitled',
            channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || '',
            thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
            position: item.snippet.position
          });
        }
      });
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return items;
}

/**
 * Fetches existing video IDs for quick lookup
 */
export async function fetchPlaylistVideoIds(token, playlistId) {
  const items = await fetchAllPlaylistItems(token, playlistId);
  return new Set(items.map((i) => i.videoId));
}

/**
 * Identifies duplicate videos in a playlist
 */
export function findDuplicatesInPlaylist(playlistItems) {
  const seen = new Map();
  const duplicates = [];

  playlistItems.forEach((item) => {
    if (seen.has(item.videoId)) {
      duplicates.push({
        ...item,
        originalItem: seen.get(item.videoId)
      });
    } else {
      seen.set(item.videoId, item);
    }
  });

  return duplicates;
}

/**
 * Deletes duplicate playlist item entries
 */
export async function removeDuplicatesFromPlaylist(token, duplicates, onProgress = () => {}) {
  const removed = [];
  const failed = [];
  const total = duplicates.length;

  for (let i = 0; i < total; i++) {
    const item = duplicates[i];
    onProgress({
      current: i + 1,
      total,
      item
    });

    try {
      await youtubeFetch(`/playlistItems?id=${item.playlistItemId}`, token, {
        method: 'DELETE'
      });
      removed.push(item);
    } catch (err) {
      failed.push({ item, error: err.message });
    }

    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { removed, failed };
}

/**
 * High-Precision Multi-Factor Anime, Manga, Manhwa, Donghua & Recap Detector
 */
const CJK_AND_EMOJI_PATTERN = /[㊙️㊗️🈲🈴🈵🈹【】「」『』〜～《》〔〕〘〙]|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

const MANGA_ANIME_STORY_TERMS = new RegExp(
  '\\b(' +
  [
    // Core Media Terms
    'anime', 'manga', 'manhwa', 'manhua', 'webtoon', 'light novel', 'web novel', 'otaku', 'cosplay', 'amv', 'mad',
    'animatic', 'seiyuu', 'voice actor', 'isekai', 'shonen', 'shounen', 'seinen', 'shojo', 'shoujo',
    'mecha', 'donghua', 'donghua recap', 'anime recap', 'manhwa recap', 'manga recap', 'webtoon recap', 'comic recap',
    'recap', 'recapped', 'subbed', 'dubbed', 'crunchyroll', 'funimation', 'toei', 'mappa', 'aniplex',
    'kadokawa', 'ufotable', 'kyoto animation', 'wit studio', 'madhouse', 'cloverworks', 'bones', 'a-1 pictures',
    'studioghibli', 'ghibli', 'trigger', 'muse asia', 'ani-one',
    // Storytelling Tropes / Manhwa Narrative Titles
    'reincarnat\\w*', 'transmigrat\\w*', 'regress\\w*', 'reborn', 'awakened', 'awakening', 'cultivat\\w*',
    'murim', 'martial art', 'wuxia', 'xianxia', 'xuanhuan', 'dungeon', 'necromancer', 'summoner',
    'alchemist', 'blacksmith', 'archmage', 'swordsman', 'demon king', 'hero', 'villainess', 'otome',
    'op mc', 'overpowered', 'status window', 'level \\d+', 'level 1', 'level 999', 'max level',
    'f-rank', 'd-rank', 's-rank', 'sss-rank', 'sss-class', 'ranker', 'hunter', 'tower of', 'monarch',
    'betrayed', 'banished', 'exiled', 'kicked out', 'abandoned', 'trash of the', 'dilapidated shed',
    'grocery store owner', 'store owner', 'shop owner', 'innkeeper', 'built an engine', 'from scrap',
    'all he inherited', 'all she inherited', 'he inherited', 'he woke up', 'i woke up', 'i became',
    'he was a', 'everyone thought', 'they looked down', 'hidden power', 'secret identity', 'double life',
    // Popular Franchises
    'jujutsu kaisen', 'jjk', 'one piece', 'luffy', 'zoro', 'demon slayer', 'kimetsu no yaiba', 'tanjiro',
    'nezuko', 'naruto', 'shippuden', 'boruto', 'sasuke', 'bleach', 'ichigo', 'thousand year blood war',
    'attack on titan', 'shingeki no kyojin', 'eren', 'levi', 'dragon ball', 'dragon ball z', 'dragon ball super',
    'goku', 'vegeta', 'chainsaw man', 'denji', 'makima', 'solo leveling', 'sung jinwoo', 'my hero academia',
    'boku no hero', 'deku', 'bakugo', 'death note', 'light yagami', 'hunter x hunter', 'gon', 'killua',
    'tokyo ghoul', 'kaneki', 'sword art online', 'kirito', 'fullmetal alchemist', 'fmab', 'edward elric',
    'jojo', 'jojo\'s bizarre adventure', 'jotaro', 'dio', 'spy x family', 'anya', 'frieren', 'dandadan',
    'oshi no ko', 'bocchi the rock', 'mob psycho', 'vinland saga', 'thorfinn', 're:zero', 'subaru', 'rem',
    'mushoku tensei', 'blue lock', 'isagi', 'haikyuu', 'hinata', 'black clover', 'asta', 'steins;gate',
    'okabe', 'evangelion', 'shinji', 'asuka', 'sailor moon', 'pokemon', 'digimon', 'yu-gi-oh', 'berserk',
    'guts', 'cowboy bebop', 'spike spiegel', 'code geass', 'lelouch', 'fairy tail', 'natsu', 'seven deadly sins',
    'meliodas', 'fire force', 'shinra', 'overlord', 'ainz', 'slime datta ken', 'rimuru', 'konosuba', 'aqua',
    'megumin', 'classroom of the elite', 'ayanokoji', 'kaiju no. 8', 'wind breaker', 'mashle', 'undead unluck',
    'hell\'s paradise', 'gabimaru', 'eminence in shadow', 'cid kagenou', 'dr. stone', 'senku', 'bungo stray dogs',
    'dazai', 'golden kamuy', 'dororo', 'akame ga kill', 'parasyte', 'erased', 'chihayafuru', 'your name',
    'kimi no na wa', 'weathering with you', 'suzume', 'makoto shinkai', 'spirited away', 'princess mononoke',
    'howl\'s moving castle', 'vtuber', 'hololive', 'nijisanji'
  ].join('|') + ')\\b',
  'i'
);

function cleanPromotionalText(text) {
  if (!text) return '';
  return text
    .replace(/(for business inquiries|business email|sponsorships?|contact me at|promo|merch|affiliate|follow me on|subscribe|instagram|twitter|tiktok)[^\n]*/gi, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .trim();
}

/**
 * Smart Genre Classifier: Fetches video details & maps to intelligent genre clusters
 */
export async function categorizePlaylistVideos(token, videoList) {
  if (!videoList || videoList.length === 0) return {};

  const videoIds = Array.from(new Set(videoList.map((v) => v.videoId)));
  const videoDetailsMap = new Map();

  // Batch query video metadata (50 at a time)
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    try {
      const query = new URLSearchParams({
        part: 'snippet,topicDetails',
        id: chunk.join(',')
      });
      const data = await youtubeFetch(`/videos?${query.toString()}`, token);
      if (data.items) {
        data.items.forEach((v) => {
          videoDetailsMap.set(v.id, {
            categoryId: v.snippet.categoryId,
            tags: v.snippet.tags || [],
            title: v.snippet.title || '',
            description: v.snippet.description || '',
            channelTitle: v.snippet.channelTitle || '',
            topicCategories: v.topicDetails?.topicCategories || []
          });
        });
      }
    } catch (err) {
      console.warn('Could not fetch video details chunk:', err);
    }
  }

  // Genre Definitions (Anime & Manga is FIRST & takes highest priority)
  const genreCategories = {
    'Anime & Manga': {
      match: (meta, title, text, channel) =>
        CJK_AND_EMOJI_PATTERN.test(title) ||
        MANGA_ANIME_STORY_TERMS.test(title) ||
        MANGA_ANIME_STORY_TERMS.test(text) ||
        /\b(recap|manhwa|manga|anime|donghua|comics?|toons?|novel|cultivation|scans?|tales)\b/i.test(channel) ||
        meta?.topicCategories?.some((t) => /anime|manga|japanese_animation|otaku/i.test(t)),
      items: []
    },
    'Tech & Programming': {
      match: (meta, title, text) =>
        meta?.categoryId === '28' ||
        meta?.topicCategories?.some((t) => /technology|computer|software|programming/i.test(t)) ||
        /\b(coding|developer|javascript|typescript|python|react|vue|angular|node|ai|machine learning|deep learning|llm|software|linux|api|web dev|github|docker|kubernetes|frontend|backend|hardware|semiconductor|cybersecurity|devops|code)\b/i.test(title) ||
        /\b(coding|developer|javascript|python|programming tutorial)\b/i.test(text),
      items: []
    },
    'Music & Audio': {
      match: (meta, title, text) =>
        meta?.categoryId === '10' ||
        meta?.topicCategories?.some((t) => /music|song|album|concert|audio|hip_hop|electronic|rock/i.test(t)) ||
        /\b(song|lofi|lo-fi|remix|soundtrack|beat|bass|audio|album|lyrics|acoustic|synth|edm|hip hop|rap|orchestra|piano|guitar|cover|vocal)\b/i.test(title),
      items: []
    },
    'Education & Science': {
      match: (meta, title, text) =>
        meta?.categoryId === '27' ||
        meta?.topicCategories?.some((t) => /education|knowledge|science|history/i.test(t)) ||
        /\b(lesson|lecture|math|physics|biology|chemistry|history|explained|documentary|course|study|how to|guide|learn|tutorial|philosophy|space|nasa)\b/i.test(title),
      items: []
    },
    'Gaming & Esports': {
      match: (meta, title, text) =>
        meta?.categoryId === '20' ||
        meta?.topicCategories?.some((t) => /video_game|gaming|esports/i.test(t)) ||
        /\b(gameplay|walkthrough|playthrough|speedrun|minecraft|gta|valorant|fps|rpg|ps5|xbox|nintendo|game review|roblox|fortnite|steam|nintendo switch)\b/i.test(title),
      items: []
    },
    'Podcasts & Talks': {
      match: (meta, title) =>
        /\b(podcast|interview|talk show|discussion|lex fridman|huberman|joe rogan|ted talk|speech|dialogue|debate)\b/i.test(title),
      items: []
    },
    'Business & Finance': {
      match: (meta, title) =>
        /\b(stock market|investing|wall street|cryptocurrency|crypto portfolio|bitcoin price|ethereum price|dividend|financial freedom|real estate investing|venture capital|inflation|recession|personal finance|stock analysis)\b/i.test(title),
      items: []
    },
    'Fitness & Health': {
      match: (meta, title) =>
        meta?.categoryId === '17' ||
        meta?.topicCategories?.some((t) => /health|fitness|sport/i.test(t)) ||
        /\b(workout|gym|exercise|yoga|calisthenics|diet|nutrition|bodybuilding|stretching|health|weight loss|cardio|muscle)\b/i.test(title),
      items: []
    },
    'Entertainment & Cinema': {
      match: (meta, title) =>
        meta?.categoryId === '1' || meta?.categoryId === '24' || meta?.categoryId === '23' ||
        /\b(trailer|movie|film|cinema|episode|comedy|standup|skit|scene|review|recap|hollywood|netflix|marvel|dc|series|actor|actress)\b/i.test(title),
      items: []
    },
    'Lifestyle & Other': {
      match: () => true,
      items: []
    }
  };

  // Classify each video
  videoList.forEach((video) => {
    const meta = videoDetailsMap.get(video.videoId);
    const title = video.title || meta?.title || '';
    const channel = meta?.channelTitle || video.channelTitle || '';
    const cleanDesc = cleanPromotionalText(meta?.description || '');
    const cleanTags = (meta?.tags || []).join(' ');
    const combinedText = `${title} ${channel} ${cleanTags} ${cleanDesc.slice(0, 400)}`;

    let matched = false;
    for (const [genreName, genreData] of Object.entries(genreCategories)) {
      if (genreName === 'Lifestyle & Other') continue;
      if (genreData.match(meta, title, combinedText, channel)) {
        genreData.items.push({
          ...video,
          metaDetails: meta
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      genreCategories['Lifestyle & Other'].items.push({
        ...video,
        metaDetails: meta
      });
    }
  });

  // Return only non-empty genres
  const result = {};
  for (const [genreName, genreData] of Object.entries(genreCategories)) {
    if (genreData.items.length > 0) {
      result[genreName] = genreData.items;
    }
  }

  return result;
}

/**
 * AI Video Summarizer:
 * Supports Chrome Built-in Prompt API, Cloud Google Gemini Flash API, or Fast Heuristic Extractor
 */
export async function summarizeVideoContent(video, metaDetails) {
  const { aiProvider = 'chrome', geminiApiKey } = await chrome.storage.sync.get(['aiProvider', 'geminiApiKey']);
  const title = video.title || 'YouTube Video';
  const channel = metaDetails?.channelTitle || video.channelTitle || '';
  const desc = (metaDetails?.description || '').slice(0, 1500);
  const tags = (metaDetails?.tags || []).slice(0, 10).join(', ');

  const prompt = `Summarize this YouTube video in 2 concise sentences and state its primary topic:\nTitle: ${title}\nChannel: ${channel}\nTags: ${tags}\nDescription:\n${desc}`;

  // 1. Google Gemini Cloud Flash API (User Choice)
  if (aiProvider === 'gemini') {
    if (geminiApiKey && geminiApiKey.trim()) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 100 }
            })
          }
        );
        if (response.ok) {
          const json = await response.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return `[Gemini Flash] ${text.trim()}`;
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back:', err);
      }
    } else {
      return 'Please enter your Google Gemini API key in Settings to use Cloud Gemini.';
    }
  }

  // 2. Chrome Built-in Prompt API / Gemini Nano (User Choice or Default)
  if (aiProvider === 'chrome' || !aiProvider) {
    if (globalThis.LanguageModel) {
      try {
        const availability = await LanguageModel.availability({
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }]
        });

        if (availability !== 'unavailable' && availability !== 'no') {
          const session = await LanguageModel.create({
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }],
            initialPrompts: [
              {
                role: 'system',
                content: 'You are a helpful YouTube video summarizer. Provide a crisp 2-sentence summary in English.'
              }
            ]
          });
          const summary = await session.prompt(prompt);
          session.destroy();
          if (summary) return `[Chrome AI] ${summary.trim()}`;
        }
      } catch (err) {
        console.warn('Chrome Prompt API failed, falling back:', err);
      }
    }
  }

  // 3. High-Quality Heuristic Summary Fallback (100% Free & Instant)
  if (desc && desc.trim()) {
    const cleanDesc = desc
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/#\w+/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    const firstSentences = cleanDesc.split(/(?<=[.?!])\s+/).slice(0, 2).join(' ');
    if (firstSentences.length > 20) {
      return `${title} (by ${channel}): ${firstSentences}`;
    }
  }

  return `${title} — Content published by ${channel || 'the creator'}.${tags ? ` Topics: ${tags}.` : ''}`;
}

/**
 * Creates a brand new YouTube playlist
 */
export async function createNewPlaylist(token, { title, description = '', privacyStatus = 'private' }) {
  if (!title || !title.trim()) {
    throw new Error('Playlist title is required');
  }

  const payload = {
    snippet: {
      title: title.trim(),
      description: description.trim(),
      defaultLanguage: 'en'
    },
    status: {
      privacyStatus: privacyStatus || 'private'
    }
  };

  const response = await youtubeFetch('/playlists?part=snippet,status', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    id: response.id,
    title: response.snippet.title,
    description: response.snippet.description,
    privacyStatus: response.status.privacyStatus,
    itemCount: 0,
    thumbnailUrl: response.snippet.thumbnails?.default?.url || ''
  };
}

/**
 * Adds a list of video IDs to a target playlist with live progress callbacks
 */
export async function addVideosToPlaylist(token, playlistId, videoIds, onProgress = () => {}) {
  const successful = [];
  const failed = [];
  const total = videoIds.length;

  for (let i = 0; i < total; i++) {
    const videoId = videoIds[i];
    onProgress({
      currentIndex: i + 1,
      total,
      videoId,
      status: 'pending'
    });

    try {
      const payload = {
        snippet: {
          playlistId: playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: videoId
          }
        }
      };

      await youtubeFetch('/playlistItems?part=snippet', token, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      successful.push(videoId);
      onProgress({
        currentIndex: i + 1,
        total,
        videoId,
        status: 'success'
      });
    } catch (err) {
      const message = err.message || 'Failed to add video';
      failed.push({ videoId, error: message });
      onProgress({
        currentIndex: i + 1,
        total,
        videoId,
        status: 'error',
        error: message
      });
    }

    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { successful, failed };
}

/**
 * Scans ALL user playlists to find videos that exist in multiple playlists
 */
export async function scanAllPlaylistsForDuplicates(token, onProgress = () => {}) {
  const playlists = await fetchUserPlaylists(token);
  if (!playlists || playlists.length === 0) {
    return { playlists: [], crossDuplicates: [] };
  }

  const videoMap = new Map();

  for (let i = 0; i < playlists.length; i++) {
    const pl = playlists[i];
    onProgress({
      currentIndex: i + 1,
      total: playlists.length,
      playlistTitle: pl.title
    });

    try {
      const items = await fetchAllPlaylistItems(token, pl.id);
      items.forEach((item) => {
        if (!videoMap.has(item.videoId)) {
          videoMap.set(item.videoId, {
            videoId: item.videoId,
            title: item.title,
            channelTitle: item.channelTitle,
            thumbnailUrl: item.thumbnailUrl,
            appearances: []
          });
        }
        const record = videoMap.get(item.videoId);
        record.appearances.push({
          playlistId: pl.id,
          playlistTitle: pl.title,
          playlistItemId: item.playlistItemId,
          position: item.position
        });
      });
    } catch (err) {
      console.warn(`Could not fetch items for playlist "${pl.title}":`, err);
    }
  }

  const crossDuplicates = [];
  videoMap.forEach((data) => {
    const uniquePlaylistIds = new Set(data.appearances.map((a) => a.playlistId));
    if (uniquePlaylistIds.size > 1) {
      crossDuplicates.push(data);
    }
  });

  return { playlists, crossDuplicates };
}

/**
 * Deletes a single playlist item
 */
export async function deletePlaylistItem(token, playlistItemId) {
  return youtubeFetch(`/playlistItems?id=${playlistItemId}`, token, {
    method: 'DELETE'
  });
}

/**
 * Resolves cross-duplicate for a single video by keeping one playlist appearance and removing the rest
 */
export async function resolveCrossDuplicatesForVideo(token, videoCrossItem, keepPlaylistItemId) {
  const toDelete = videoCrossItem.appearances.filter((a) => a.playlistItemId !== keepPlaylistItemId);
  const results = { removed: [], failed: [] };

  for (const app of toDelete) {
    try {
      await deletePlaylistItem(token, app.playlistItemId);
      results.removed.push(app);
    } catch (err) {
      results.failed.push({ appearance: app, error: err.message });
    }
  }

  return results;
}

/**
 * Bulk resolves all cross duplicates by keeping the first playlist appearance and removing all other copies
 */
export async function bulkResolveAllCrossDuplicates(token, crossDuplicatesList, onProgress = () => {}) {
  const results = { removed: 0, failed: 0 };
  let current = 0;
  const total = crossDuplicatesList.reduce((acc, v) => acc + (v.appearances.length - 1), 0);

  for (const item of crossDuplicatesList) {
    const toRemove = item.appearances.slice(1);
    for (const app of toRemove) {
      current++;
      onProgress({
        current,
        total,
        videoTitle: item.title,
        fromPlaylist: app.playlistTitle
      });

      try {
        await deletePlaylistItem(token, app.playlistItemId);
        results.removed++;
      } catch (err) {
        console.warn('Failed to delete duplicate playlist item:', err);
        results.failed++;
      }

      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return results;
}
