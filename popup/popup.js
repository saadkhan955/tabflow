/**
 * YouTube Tabs to Playlist - Clean Production Popup Controller
 * Powered by Lucide Icons & Tailwind CSS
 */

import { getOpenYouTubeTabs, buildYouTubeQueueUrl } from '../scripts/tab-extractor.js';
import {
  getAccessToken,
  clearAuthSession,
  fetchUserProfile,
  fetchUserPlaylists,
  fetchPlaylistVideoIds,
  fetchAllPlaylistItems,
  findDuplicatesInPlaylist,
  removeDuplicatesFromPlaylist,
  categorizePlaylistVideos,
  summarizeVideoContent,
  createNewPlaylist,
  addVideosToPlaylist,
  scanAllPlaylistsForDuplicates,
  deletePlaylistItem,
  resolveCrossDuplicatesForVideo,
  bulkResolveAllCrossDuplicates
} from '../scripts/youtube-api.js';

// Application State
const state = {
  currentScope: 'current',
  currentView: 'save',
  currentOrganizeSubView: 'single',
  activeMode: 'existing',
  detectedTabs: [],
  selectedTabIds: new Set(),
  userPlaylists: [],
  currentPlaylistId: null,
  currentPlaylistTitle: '',
  existingPlaylistVideoIds: new Set(),
  justSavedVideoIds: new Set(),
  authToken: null,
  userProfile: null,
  isProcessing: false,
  analyzedPlaylistItems: [],
  analyzedDuplicates: [],
  analyzedGenres: {},
  analyzedPlaylistTitle: '',
  analyzedCrossDuplicates: []
};

// Lucide Icon Refresher Helper
function refreshIcons() {
  if (globalThis.lucide && typeof globalThis.lucide.createIcons === 'function') {
    globalThis.lucide.createIcons();
  }
}

// Lucide Genre Icons Map
function getGenreIconSvg(genreName) {
  const icons = {
    'Anime & Manga': '<i data-lucide="book-open" style="width:13px;height:13px;"></i>',
    'Tech & Programming': '<i data-lucide="code" style="width:13px;height:13px;"></i>',
    'Music & Audio': '<i data-lucide="music" style="width:13px;height:13px;"></i>',
    'Education & Science': '<i data-lucide="graduation-cap" style="width:13px;height:13px;"></i>',
    'Gaming & Esports': '<i data-lucide="gamepad-2" style="width:13px;height:13px;"></i>',
    'Podcasts & Talks': '<i data-lucide="mic" style="width:13px;height:13px;"></i>',
    'Business & Finance': '<i data-lucide="briefcase" style="width:13px;height:13px;"></i>',
    'Fitness & Health': '<i data-lucide="activity" style="width:13px;height:13px;"></i>',
    'Entertainment & Cinema': '<i data-lucide="film" style="width:13px;height:13px;"></i>',
    'Lifestyle & Other': '<i data-lucide="compass" style="width:13px;height:13px;"></i>'
  };
  return icons[genreName] || '<i data-lucide="circle" style="width:13px;height:13px;"></i>';
}

// DOM Elements Map
const elements = {
  navSaveTabs: document.getElementById('navSaveTabs'),
  navOrganizePlaylist: document.getElementById('navOrganizePlaylist'),
  viewSaveTabs: document.getElementById('viewSaveTabs'),
  viewOrganizePlaylist: document.getElementById('viewOrganizePlaylist'),
  subTabSinglePlaylist: document.getElementById('subTabSinglePlaylist'),
  subTabCrossPlaylists: document.getElementById('subTabCrossPlaylists'),
  subViewSinglePlaylist: document.getElementById('subViewSinglePlaylist'),
  subViewCrossPlaylists: document.getElementById('subViewCrossPlaylists'),
  scopeCurrentWindow: document.getElementById('scopeCurrentWindow'),
  scopeAllWindows: document.getElementById('scopeAllWindows'),
  detectedCountBadge: document.getElementById('detectedCountBadge'),
  tabListContainer: document.getElementById('tabListContainer'),
  emptyTabsState: document.getElementById('emptyTabsState'),
  selectAllCheckbox: document.getElementById('selectAllCheckbox'),
  selectedCountText: document.getElementById('selectedCountText'),
  tabSearchInput: document.getElementById('tabSearchInput'),
  btnRefreshTabs: document.getElementById('btnRefreshTabs'),
  btnOpenYouTube: document.getElementById('btnOpenYouTube'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  modePanels: {
    existing: document.getElementById('modeExisting'),
    new: document.getElementById('modeNew'),
    manual: document.getElementById('modeManual')
  },
  authStatusText: document.getElementById('authStatusText'),
  authRequiredNotice: document.getElementById('authRequiredNotice'),
  btnSignIn: document.getElementById('btnSignIn'),
  playlistSelectSection: document.getElementById('playlistSelectSection'),
  playlistSelect: document.getElementById('playlistSelect'),
  btnReloadPlaylists: document.getElementById('btnReloadPlaylists'),
  selectedPlaylistMeta: document.getElementById('selectedPlaylistMeta'),
  newPlaylistTitle: document.getElementById('newPlaylistTitle'),
  newPlaylistDesc: document.getElementById('newPlaylistDesc'),
  newPlaylistPrivacy: document.getElementById('newPlaylistPrivacy'),
  manualPlaylistInput: document.getElementById('manualPlaylistInput'),
  optCloseTabs: document.getElementById('optCloseTabs'),
  btnExportMenu: document.getElementById('btnExportMenu'),
  exportMenuDropdown: document.getElementById('exportMenuDropdown'),
  btnCopyUrls: document.getElementById('btnCopyUrls'),
  btnCopyIds: document.getElementById('btnCopyIds'),
  btnExportMarkdown: document.getElementById('btnExportMarkdown'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnSaveToPlaylist: document.getElementById('btnSaveToPlaylist'),
  btnSaveText: document.getElementById('btnSaveText'),
  btnOpenQueue: document.getElementById('btnOpenQueue'),
  organizePlaylistSelect: document.getElementById('organizePlaylistSelect'),
  btnAnalyzePlaylist: document.getElementById('btnAnalyzePlaylist'),
  organizeResultsSection: document.getElementById('organizeResultsSection'),
  dupCountBadge: document.getElementById('dupCountBadge'),
  duplicateListContainer: document.getElementById('duplicateListContainer'),
  btnRemoveDuplicates: document.getElementById('btnRemoveDuplicates'),
  genresListContainer: document.getElementById('genresListContainer'),
  btnSplitAllGenres: document.getElementById('btnSplitAllGenres'),
  btnScanCrossDuplicates: document.getElementById('btnScanCrossDuplicates'),
  crossDuplicatesResultsSection: document.getElementById('crossDuplicatesResultsSection'),
  crossDupCountBadge: document.getElementById('crossDupCountBadge'),
  crossDuplicateActionsBar: document.getElementById('crossDuplicateActionsBar'),
  btnBulkResolveCrossDuplicates: document.getElementById('btnBulkResolveCrossDuplicates'),
  crossDuplicatesListContainer: document.getElementById('crossDuplicatesListContainer'),
  statusNotification: document.getElementById('statusNotification'),
  statusIcon: document.getElementById('statusIcon'),
  statusMessage: document.getElementById('statusMessage'),
  statusDetails: document.getElementById('statusDetails'),
  statusActionArea: document.getElementById('statusActionArea'),
  btnViewCreatedPlaylist: document.getElementById('btnViewCreatedPlaylist'),
  btnCloseSavedTabsNow: document.getElementById('btnCloseSavedTabsNow'),
  progressBarContainer: document.getElementById('progressBarContainer'),
  progressBarFill: document.getElementById('progressBarFill'),
  btnToggleTheme: document.getElementById('btnToggleTheme'),
  themeToggleIcon: document.getElementById('themeToggleIcon'),
  selectThemePreference: document.getElementById('selectThemePreference'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  settingsModal: document.getElementById('settingsModal'),
  settingsUserProfile: document.getElementById('settingsUserProfile'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  userSubText: document.getElementById('userSubText'),
  btnSignOut: document.getElementById('btnSignOut'),
  settingsSignInArea: document.getElementById('settingsSignInArea'),
  btnSettingsSignIn: document.getElementById('btnSettingsSignIn'),
  inputGeminiApiKey: document.getElementById('inputGeminiApiKey'),
  selectAiProvider: document.getElementById('selectAiProvider'),
  geminiKeyGroup: document.getElementById('geminiKeyGroup'),
  chromeAiStatus: document.getElementById('chromeAiStatus'),
  inputCustomClientId: document.getElementById('inputCustomClientId'),
  inputCustomToken: document.getElementById('inputCustomToken'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  redirectUriInput: document.getElementById('redirectUriInput'),
  btnCopyRedirectUri: document.getElementById('btnCopyRedirectUri')
};

// Theme Controller
let currentEffectiveTheme = 'dark';

async function initTheme() {
  const data = await chrome.storage.local.get(['themePreference']);
  const pref = data.themePreference || 'dark';
  applyTheme(pref);

  if (elements.selectThemePreference) {
    elements.selectThemePreference.value = pref;
  }

  // Auto detect OS dark/light mode changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const res = await chrome.storage.local.get(['themePreference']);
    if (res.themePreference === 'system') {
      applyTheme('system');
    }
  });
}

function applyTheme(pref) {
  let effective = pref;
  if (pref === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', effective);
  currentEffectiveTheme = effective;

  if (elements.themeToggleIcon) {
    elements.themeToggleIcon.setAttribute('data-lucide', effective === 'dark' ? 'sun' : 'moon');
  }
  if (elements.btnToggleTheme) {
    elements.btnToggleTheme.setAttribute(
      'title',
      effective === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'
    );
  }

  refreshIcons();
}

async function toggleThemeQuick() {
  const newTheme = currentEffectiveTheme === 'dark' ? 'light' : 'dark';
  await chrome.storage.local.set({ themePreference: newTheme });
  if (elements.selectThemePreference) {
    elements.selectThemePreference.value = newTheme;
  }
  applyTheme(newTheme);
}

// Initialize Extension
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initTheme();
  refreshIcons();
  await loadSavedOptions();
  await checkAuth(false);
  await refreshTabs();
});

function setupEventListeners() {
  if (elements.btnToggleTheme) {
    elements.btnToggleTheme.addEventListener('click', toggleThemeQuick);
  }
  if (elements.selectThemePreference) {
    elements.selectThemePreference.addEventListener('change', async (e) => {
      const val = e.target.value;
      await chrome.storage.local.set({ themePreference: val });
      applyTheme(val);
    });
  }

  elements.navSaveTabs.addEventListener('click', () => switchFeatureView('save'));
  elements.navOrganizePlaylist.addEventListener('click', () => switchFeatureView('organize'));

  if (elements.subTabSinglePlaylist && elements.subTabCrossPlaylists) {
    elements.subTabSinglePlaylist.addEventListener('click', () => switchOrganizeSubView('single'));
    elements.subTabCrossPlaylists.addEventListener('click', () => switchOrganizeSubView('cross'));
  }

  elements.scopeCurrentWindow.addEventListener('click', () => setScope('current'));
  elements.scopeAllWindows.addEventListener('click', () => setScope('all'));

  elements.btnRefreshTabs.addEventListener('click', () => refreshTabs());
  elements.btnOpenSettings.addEventListener('click', () => openSettingsModal());
  elements.btnCloseSettings.addEventListener('click', () => closeSettingsModal());
  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) {
        closeSettingsModal();
      }
    });
  }
  elements.btnOpenYouTube.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.youtube.com' });
  });

  elements.selectAllCheckbox.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
  elements.tabSearchInput.addEventListener('input', () => renderTabList());

  elements.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  elements.btnReloadPlaylists.addEventListener('click', () => loadPlaylists(true));
  elements.playlistSelect.addEventListener('change', handlePlaylistSelectChange);
  elements.manualPlaylistInput.addEventListener('input', debounce(handleManualPlaylistChange, 600));

  elements.btnAnalyzePlaylist.addEventListener('click', handleAnalyzePlaylist);
  elements.btnRemoveDuplicates.addEventListener('click', handleRemoveDuplicates);
  elements.btnSplitAllGenres.addEventListener('click', handleSplitAllGenres);

  if (elements.btnScanCrossDuplicates) {
    elements.btnScanCrossDuplicates.addEventListener('click', handleScanCrossDuplicates);
  }
  if (elements.btnBulkResolveCrossDuplicates) {
    elements.btnBulkResolveCrossDuplicates.addEventListener('click', handleBulkResolveCrossDuplicates);
  }

  elements.btnSignIn.addEventListener('click', () => handleSignIn());
  elements.btnSettingsSignIn.addEventListener('click', () => handleSignIn());
  elements.btnSignOut.addEventListener('click', () => handleSignOut());

  if (elements.selectAiProvider) {
    elements.selectAiProvider.addEventListener('change', () => {
      updateAiProviderVisibility(elements.selectAiProvider.value);
    });
  }

  elements.btnSaveSettings.addEventListener('click', saveCustomSettings);

  if (elements.btnCopyRedirectUri) {
    elements.btnCopyRedirectUri.addEventListener('click', async () => {
      const uri = elements.redirectUriInput ? elements.redirectUriInput.value : chrome.identity.getRedirectURL();
      try {
        await navigator.clipboard.writeText(uri);
        elements.btnCopyRedirectUri.innerHTML = `
          <i data-lucide="check" style="width:12px;height:12px;"></i>
          Copied
        `;
        refreshIcons();
        setTimeout(() => {
          if (elements.btnCopyRedirectUri) {
            elements.btnCopyRedirectUri.innerHTML = `
              <i data-lucide="copy" style="width:12px;height:12px;"></i>
              Copy
            `;
            refreshIcons();
          }
        }, 2000);
      } catch {
        if (elements.redirectUriInput) {
          elements.redirectUriInput.select();
        }
      }
    });
  }

  elements.btnCloseSavedTabsNow.addEventListener('click', handleCloseSavedTabsNow);

  elements.btnExportMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.exportMenuDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    elements.exportMenuDropdown.classList.add('hidden');
  });

  elements.btnCopyUrls.addEventListener('click', () => copySelectedLinks('urls'));
  elements.btnCopyIds.addEventListener('click', () => copySelectedLinks('ids'));
  elements.btnExportMarkdown.addEventListener('click', () => copySelectedLinks('markdown'));
  elements.btnExportJson.addEventListener('click', () => copySelectedLinks('json'));

  elements.btnSaveToPlaylist.addEventListener('click', handleSaveToPlaylist);
  elements.btnOpenQueue.addEventListener('click', handleOpenInstantQueue);

  elements.optCloseTabs.addEventListener('change', (e) => {
    chrome.storage.sync.set({ optCloseTabs: e.target.checked });
  });
}

function switchFeatureView(view) {
  state.currentView = view;
  elements.navSaveTabs.classList.toggle('active', view === 'save');
  elements.navOrganizePlaylist.classList.toggle('active', view === 'organize');
  elements.viewSaveTabs.classList.toggle('hidden', view !== 'save');
  elements.viewOrganizePlaylist.classList.toggle('hidden', view !== 'organize');

  if (view === 'organize' && state.userPlaylists.length === 0 && state.authToken) {
    loadPlaylists(false);
  }
  refreshIcons();
}

function switchOrganizeSubView(subView) {
  state.currentOrganizeSubView = subView;
  elements.subTabSinglePlaylist.classList.toggle('active', subView === 'single');
  elements.subTabCrossPlaylists.classList.toggle('active', subView === 'cross');
  elements.subViewSinglePlaylist.classList.toggle('hidden', subView !== 'single');
  elements.subViewCrossPlaylists.classList.toggle('hidden', subView !== 'cross');
  refreshIcons();
}

async function setScope(scope) {
  state.currentScope = scope;
  elements.scopeCurrentWindow.classList.toggle('active', scope === 'current');
  elements.scopeAllWindows.classList.toggle('active', scope === 'all');
  await refreshTabs();
}

async function refreshTabs() {
  const isCurrent = state.currentScope === 'current';
  state.detectedTabs = await getOpenYouTubeTabs({ currentWindowOnly: isCurrent });

  state.selectedTabIds = new Set(
    state.detectedTabs
      .filter((t) => !state.existingPlaylistVideoIds.has(t.videoId) && !state.justSavedVideoIds.has(t.videoId))
      .map((t) => t.tabId)
  );

  renderTabList();
  updateStats();
}

function renderTabList() {
  const searchTerm = elements.tabSearchInput.value.toLowerCase().trim();
  const filtered = state.detectedTabs.filter(
    (tab) => tab.title.toLowerCase().includes(searchTerm) || tab.videoId.includes(searchTerm)
  );

  elements.tabListContainer.innerHTML = '';

  if (filtered.length === 0) {
    if (state.detectedTabs.length === 0) {
      elements.emptyTabsState.classList.remove('hidden');
    } else {
      elements.tabListContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#717171;font-size:11px;">No tabs match your filter.</div>';
    }
    refreshIcons();
    return;
  }

  elements.emptyTabsState.classList.add('hidden');

  filtered.forEach((tab) => {
    const isChecked = state.selectedTabIds.has(tab.tabId);
    const isAlreadyInPlaylist = state.existingPlaylistVideoIds.has(tab.videoId);
    const isJustSaved = state.justSavedVideoIds.has(tab.videoId);

    const item = document.createElement('div');
    let itemClass = 'tab-item';
    if (isChecked) itemClass += ' selected';
    if (isAlreadyInPlaylist) itemClass += ' saved-in-playlist';
    if (isJustSaved) itemClass += ' just-added';
    item.className = itemClass;

    let badgeHtml = '';
    if (isJustSaved) {
      badgeHtml = `<span class="pill-badge pill-badge-just-saved">Added</span>`;
    } else if (isAlreadyInPlaylist) {
      badgeHtml = `<span class="pill-badge pill-badge-in-playlist">In Playlist</span>`;
    }

    let thumbOverlay = '';
    if (isJustSaved || isAlreadyInPlaylist) {
      thumbOverlay = `<div class="tab-thumb-saved-overlay"><i data-lucide="check" style="width:14px;height:14px;"></i></div>`;
    }

    item.innerHTML = `
      <input type="checkbox" class="tab-checkbox" data-tab-id="${tab.tabId}" ${isChecked ? 'checked' : ''}>
      <div class="tab-thumb-box">
        <img src="${tab.thumbnailUrl}" class="tab-thumb-img" alt="Thumbnail" loading="lazy">
        ${thumbOverlay}
      </div>
      <div class="tab-info">
        <div class="tab-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</div>
        <div class="tab-meta-row">
          <span class="tab-meta">${tab.videoId}</span>
          ${badgeHtml}
        </div>
      </div>
      <button class="tab-remove-btn" title="Deselect this tab" data-remove-id="${tab.tabId}">
        <i data-lucide="x" style="width:11px;height:11px;"></i>
      </button>
    `;

    const checkbox = item.querySelector('.tab-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleTabSelection(tab.tabId, checkbox.checked);
    });

    const removeBtn = item.querySelector('.tab-remove-btn');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTabSelection(tab.tabId, false);
    });

    item.addEventListener('click', (e) => {
      if (e.target !== checkbox && !removeBtn.contains(e.target)) {
        const nextState = !state.selectedTabIds.has(tab.tabId);
        toggleTabSelection(tab.tabId, nextState);
      }
    });

    elements.tabListContainer.appendChild(item);
  });

  refreshIcons();
}

function toggleTabSelection(tabId, isSelected) {
  if (isSelected) {
    state.selectedTabIds.add(tabId);
  } else {
    state.selectedTabIds.delete(tabId);
  }
  updateStats();
  renderTabList();
}

function toggleSelectAll(selectAll) {
  if (selectAll) {
    state.selectedTabIds = new Set(state.detectedTabs.map((t) => t.tabId));
  } else {
    state.selectedTabIds.clear();
  }
  updateStats();
  renderTabList();
}

function updateStats() {
  const total = state.detectedTabs.length;
  const selected = state.selectedTabIds.size;

  let alreadyCount = 0;
  state.detectedTabs.forEach((t) => {
    if (state.existingPlaylistVideoIds.has(t.videoId) || state.justSavedVideoIds.has(t.videoId)) {
      alreadyCount++;
    }
  });

  elements.detectedCountBadge.textContent = `${total} tab${total === 1 ? '' : 's'}`;
  elements.selectedCountText.textContent = `${selected}`;
  elements.selectAllCheckbox.checked = total > 0 && selected === total;
  elements.selectAllCheckbox.indeterminate = selected > 0 && selected < total;

  if (selected === 0 && total > 0 && alreadyCount === total) {
    elements.btnSaveText.textContent = `All ${total} Video(s) Already in Playlist`;
  } else {
    elements.btnSaveText.textContent = `Save ${selected} Video${selected === 1 ? '' : 's'} to Playlist`;
  }
}

function switchMode(mode) {
  state.activeMode = mode;
  elements.modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  elements.modePanels.existing.classList.toggle('active', mode === 'existing');
  elements.modePanels.new.classList.toggle('active', mode === 'new');
  elements.modePanels.manual.classList.toggle('active', mode === 'manual');

  if (mode === 'new') {
    state.existingPlaylistVideoIds.clear();
    renderTabList();
    updateStats();
  } else if (mode === 'existing') {
    handlePlaylistSelectChange();
  } else if (mode === 'manual') {
    handleManualPlaylistChange();
  }
}

async function checkAuth(interactive = false) {
  try {
    const token = await getAccessToken(interactive);
    if (!token) {
      updateAuthUI(false);
      return;
    }

    state.authToken = token;
    state.userProfile = await fetchUserProfile(token);
    updateAuthUI(true);
    await loadPlaylists(false);
  } catch (err) {
    state.authToken = null;
    state.userProfile = null;
    updateAuthUI(false);

    if (interactive) {
      if (err.message === 'MISSING_CLIENT_ID' || err.code === 'MISSING_CLIENT_ID' || err.message.includes('OAuth2 client id')) {
        openSettingsModal();
        showStatus('info', 'Please enter your Google Cloud OAuth Client ID in Settings.');
      } else {
        showStatus('error', `Sign in error: ${err.message}`);
      }
    }
  }
}

function updateAuthUI(isAuthenticated) {
  if (isAuthenticated) {
    const title = state.userProfile?.title || 'Google Account';
    elements.authStatusText.textContent = title;
    elements.authRequiredNotice.classList.add('hidden');
    elements.playlistSelectSection.classList.remove('hidden');

    elements.settingsUserProfile.classList.remove('hidden');
    elements.settingsSignInArea.classList.add('hidden');
    elements.userName.textContent = title;
    elements.userSubText.textContent = 'Connected to YouTube';
    if (state.userProfile?.avatar) {
      elements.userAvatar.src = state.userProfile.avatar;
    }
  } else {
    elements.authStatusText.textContent = 'Ready (Sign in or Instant Queue)';
    elements.authRequiredNotice.classList.remove('hidden');
    elements.playlistSelectSection.classList.add('hidden');

    elements.settingsUserProfile.classList.add('hidden');
    elements.settingsSignInArea.classList.remove('hidden');
  }
  refreshIcons();
}

async function handleSignIn() {
  await checkAuth(true);
}

async function handleSignOut() {
  await clearAuthSession();
  state.authToken = null;
  state.userProfile = null;
  state.userPlaylists = [];
  state.existingPlaylistVideoIds.clear();
  state.justSavedVideoIds.clear();
  updateAuthUI(false);
  renderTabList();
  updateStats();
  showStatus('info', 'Signed out from YouTube session');
}

async function loadPlaylists(forceRefresh = false) {
  if (!state.authToken) return;

  try {
    elements.playlistSelect.innerHTML = '<option value="" disabled selected>Loading playlists...</option>';
    elements.organizePlaylistSelect.innerHTML = '<option value="" disabled selected>Loading playlists...</option>';
    
    if (!forceRefresh) {
      const { cachedPlaylists } = await chrome.storage.local.get('cachedPlaylists');
      if (cachedPlaylists && cachedPlaylists.length > 0) {
        state.userPlaylists = cachedPlaylists;
        renderPlaylistsSelect();
        return;
      }
    }

    state.userPlaylists = await fetchUserPlaylists(state.authToken);
    renderPlaylistsSelect();
  } catch (err) {
    console.error('Error fetching playlists:', err);
    elements.playlistSelect.innerHTML = '<option value="" disabled selected>Error loading playlists</option>';
    showStatus('error', `Could not fetch playlists: ${err.message}`);
  }
}

function renderPlaylistsSelect() {
  elements.playlistSelect.innerHTML = '';
  elements.organizePlaylistSelect.innerHTML = '';

  if (state.userPlaylists.length === 0) {
    elements.playlistSelect.innerHTML = '<option value="" disabled selected>No playlists found on your channel</option>';
    elements.organizePlaylistSelect.innerHTML = '<option value="" disabled selected>No playlists found</option>';
    return;
  }

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Select a Playlist --';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  elements.playlistSelect.appendChild(defaultOption);

  const defaultOrganizeOpt = document.createElement('option');
  defaultOrganizeOpt.value = '';
  defaultOrganizeOpt.textContent = '-- Select Playlist to Analyze --';
  defaultOrganizeOpt.disabled = true;
  defaultOrganizeOpt.selected = true;
  elements.organizePlaylistSelect.appendChild(defaultOrganizeOpt);

  state.userPlaylists.forEach((pl) => {
    const opt = document.createElement('option');
    opt.value = pl.id;
    opt.textContent = `${pl.title} (${pl.itemCount} items) [${pl.privacyStatus}]`;
    elements.playlistSelect.appendChild(opt);

    const optOrg = document.createElement('option');
    optOrg.value = pl.id;
    optOrg.textContent = `${pl.title} (${pl.itemCount} items)`;
    elements.organizePlaylistSelect.appendChild(optOrg);
  });

  chrome.storage.local.get(['lastSelectedPlaylistId'], (res) => {
    if (res.lastSelectedPlaylistId && state.userPlaylists.some((p) => p.id === res.lastSelectedPlaylistId)) {
      elements.playlistSelect.value = res.lastSelectedPlaylistId;
      elements.organizePlaylistSelect.value = res.lastSelectedPlaylistId;
      handlePlaylistSelectChange();
    }
  });
}

async function handlePlaylistSelectChange() {
  const selectedId = elements.playlistSelect.value;
  if (!selectedId) {
    elements.selectedPlaylistMeta.classList.add('hidden');
    state.existingPlaylistVideoIds.clear();
    renderTabList();
    updateStats();
    return;
  }

  chrome.storage.local.set({ lastSelectedPlaylistId: selectedId });
  const playlist = state.userPlaylists.find((p) => p.id === selectedId);
  if (playlist) {
    state.currentPlaylistId = playlist.id;
    state.currentPlaylistTitle = playlist.title;
    elements.selectedPlaylistMeta.textContent = `Checking existing videos in "${playlist.title}"...`;
    elements.selectedPlaylistMeta.classList.remove('hidden');

    if (state.authToken) {
      state.existingPlaylistVideoIds = await fetchPlaylistVideoIds(state.authToken, playlist.id);
      
      const inPlaylistCount = state.detectedTabs.filter((t) => state.existingPlaylistVideoIds.has(t.videoId)).length;
      if (inPlaylistCount > 0) {
        elements.selectedPlaylistMeta.textContent = `Target: "${playlist.title}" — ${inPlaylistCount} open tab(s) already saved`;
        state.selectedTabIds = new Set(
          state.detectedTabs
            .filter((t) => !state.existingPlaylistVideoIds.has(t.videoId) && !state.justSavedVideoIds.has(t.videoId))
            .map((t) => t.tabId)
        );
      } else {
        elements.selectedPlaylistMeta.textContent = `Target: "${playlist.title}" (${playlist.itemCount} videos)`;
      }

      renderTabList();
      updateStats();
    }
  }
}

async function handleManualPlaylistChange() {
  const input = elements.manualPlaylistInput.value.trim();
  const playlistId = parsePlaylistId(input);
  if (playlistId && state.authToken) {
    state.currentPlaylistId = playlistId;
    state.existingPlaylistVideoIds = await fetchPlaylistVideoIds(state.authToken, playlistId);
    renderTabList();
    updateStats();
  }
}

async function handleSaveToPlaylist() {
  const selectedTabs = state.detectedTabs.filter((t) => state.selectedTabIds.has(t.tabId));
  
  if (selectedTabs.length === 0) {
    const total = state.detectedTabs.length;
    const allAlreadyIn = state.detectedTabs.every((t) => state.existingPlaylistVideoIds.has(t.videoId) || state.justSavedVideoIds.has(t.videoId));
    if (allAlreadyIn && total > 0) {
      showStatus('success', 'All open YouTube tabs are already in this playlist.');
    } else {
      showStatus('warning', 'Please select at least one video to save.');
    }
    return;
  }

  if (!state.authToken) {
    try {
      state.authToken = await getAccessToken(true);
    } catch (err) {
      if (err.message === 'MISSING_CLIENT_ID' || err.code === 'MISSING_CLIENT_ID' || err.message.includes('OAuth2 client id')) {
        openSettingsModal();
        showStatus('info', 'To save directly, configure your Google OAuth Client ID in Settings.');
      } else {
        showStatus('error', `Authentication error: ${err.message}`);
      }
      return;
    }
  }

  let targetPlaylistId = '';
  let targetPlaylistTitle = '';

  if (state.activeMode === 'existing') {
    targetPlaylistId = elements.playlistSelect.value;
    if (!targetPlaylistId) {
      showStatus('warning', 'Please select an existing playlist from the dropdown.');
      return;
    }
    const pl = state.userPlaylists.find((p) => p.id === targetPlaylistId);
    targetPlaylistTitle = pl ? pl.title : 'Selected Playlist';
  } else if (state.activeMode === 'new') {
    const title = elements.newPlaylistTitle.value.trim();
    if (!title) {
      showStatus('warning', 'Please enter a title for the new playlist.');
      elements.newPlaylistTitle.focus();
      return;
    }

    const desc = elements.newPlaylistDesc.value.trim();
    const privacy = elements.newPlaylistPrivacy.value;

    showStatus('loading', `Creating playlist "${title}"...`);
    try {
      const created = await createNewPlaylist(state.authToken, {
        title,
        description: desc,
        privacyStatus: privacy
      });
      targetPlaylistId = created.id;
      targetPlaylistTitle = created.title;
      loadPlaylists(true);
    } catch (err) {
      showStatus('error', `Failed to create playlist: ${err.message}`);
      return;
    }
  } else if (state.activeMode === 'manual') {
    const input = elements.manualPlaylistInput.value.trim();
    targetPlaylistId = parsePlaylistId(input);
    if (!targetPlaylistId) {
      showStatus('warning', 'Please enter a valid YouTube Playlist ID or URL.');
      return;
    }
    targetPlaylistTitle = `Playlist (${targetPlaylistId})`;
  }

  const videoIds = selectedTabs.map((t) => t.videoId);
  const total = videoIds.length;

  state.isProcessing = true;
  setControlsDisabled(true);

  showProgress(0, total, 'Starting video import...');

  try {
    const { successful, failed } = await addVideosToPlaylist(
      state.authToken,
      targetPlaylistId,
      videoIds,
      (progress) => {
        const percent = Math.round((progress.currentIndex / progress.total) * 100);
        const currentTab = selectedTabs[progress.currentIndex - 1];
        const statusText = progress.status === 'error'
          ? `Skipped "${currentTab?.title || progress.videoId}"`
          : `Adding [${progress.currentIndex}/${progress.total}]: "${currentTab?.title || progress.videoId}"`;
        
        showProgress(percent, progress.total, statusText);
      }
    );

    successful.forEach((vId) => {
      state.justSavedVideoIds.add(vId);
      state.existingPlaylistVideoIds.add(vId);
    });

    selectedTabs.forEach((tab) => {
      if (successful.includes(tab.videoId)) {
        state.selectedTabIds.delete(tab.tabId);
      }
    });

    renderTabList();
    updateStats();

    const successCount = successful.length;
    const failCount = failed.length;
    const playlistUrl = `https://www.youtube.com/playlist?list=${targetPlaylistId}`;

    elements.btnViewCreatedPlaylist.href = playlistUrl;
    elements.statusActionArea.classList.remove('hidden');

    if (failCount === 0) {
      showStatus('success', `Added ${successCount} video(s) to "${targetPlaylistTitle}". All marked as saved.`);
    } else {
      showStatus('warning', `Saved ${successCount} video(s). ${failCount} video(s) skipped/failed.`);
    }

    if (elements.optCloseTabs.checked) {
      const tabsToClose = selectedTabs
        .filter((t) => successful.includes(t.videoId))
        .map((t) => t.tabId);
      
      if (tabsToClose.length > 0) {
        await chrome.tabs.remove(tabsToClose);
        await refreshTabs();
      }
    }
  } catch (err) {
    showStatus('error', `Error saving to playlist: ${err.message}`);
  } finally {
    state.isProcessing = false;
    setControlsDisabled(false);
  }
}

// ==================== CLEAN & ORGANIZE LOGIC ====================

async function handleAnalyzePlaylist() {
  const playlistId = elements.organizePlaylistSelect.value;
  if (!playlistId) {
    showStatus('warning', 'Please select a playlist to analyze.');
    return;
  }

  if (!state.authToken) {
    try {
      state.authToken = await getAccessToken(true);
    } catch (err) {
      showStatus('error', `Sign in required: ${err.message}`);
      return;
    }
  }

  const pl = state.userPlaylists.find((p) => p.id === playlistId);
  state.analyzedPlaylistTitle = pl ? pl.title : 'Playlist';

  showStatus('loading', `Fetching all videos from "${state.analyzedPlaylistTitle}"...`);
  setControlsDisabled(true);

  try {
    const items = await fetchAllPlaylistItems(state.authToken, playlistId);
    state.analyzedPlaylistItems = items;

    if (items.length === 0) {
      showStatus('info', 'This playlist is empty.');
      elements.organizeResultsSection.classList.add('hidden');
      return;
    }

    // 1. Duplicate Detection
    const duplicates = findDuplicatesInPlaylist(items);
    state.analyzedDuplicates = duplicates;
    renderDuplicatesView(duplicates);

    // 2. High-Accuracy Smart Genre Classification (Anime Prioritized)
    showStatus('loading', `Analyzing & categorizing ${items.length} videos with AI metadata...`);
    const genres = await categorizePlaylistVideos(state.authToken, items);
    state.analyzedGenres = genres;
    renderGenresView(genres);

    elements.organizeResultsSection.classList.remove('hidden');
    showStatus('success', `Analysis complete. Found ${duplicates.length} duplicate(s) and categorized into ${Object.keys(genres).length} genres.`);
  } catch (err) {
    showStatus('error', `Analysis failed: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

function renderDuplicatesView(duplicates) {
  elements.duplicateListContainer.innerHTML = '';
  elements.dupCountBadge.textContent = `${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'}`;

  if (duplicates.length === 0) {
    elements.duplicateListContainer.innerHTML = '<div style="color:#2ba640;font-size:11px;padding:6px;">Clean. No duplicate videos found in this playlist.</div>';
    elements.btnRemoveDuplicates.classList.add('hidden');
    return;
  }

  elements.btnRemoveDuplicates.classList.remove('hidden');
  elements.btnRemoveDuplicates.innerHTML = `
    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
    <span>Remove ${duplicates.length} Duplicate Cop${duplicates.length === 1 ? 'y' : 'ies'}</span>
  `;

  duplicates.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'duplicate-item';
    row.innerHTML = `
      <img src="${item.thumbnailUrl}" style="width:44px;height:28px;object-fit:cover;border-radius:3px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
        <div style="font-size:9px;color:#d32f2f;">Duplicate instance (Position ${item.position + 1})</div>
      </div>
    `;
    elements.duplicateListContainer.appendChild(row);
  });

  refreshIcons();
}

async function handleRemoveDuplicates() {
  if (state.analyzedDuplicates.length === 0) return;

  setControlsDisabled(true);
  showProgress(0, state.analyzedDuplicates.length, 'Removing duplicate video instances...');

  try {
    const { removed, failed } = await removeDuplicatesFromPlaylist(
      state.authToken,
      state.analyzedDuplicates,
      (p) => {
        const percent = Math.round((p.current / p.total) * 100);
        showProgress(percent, p.total, `Deleting duplicate [${p.current}/${p.total}]: "${p.item.title}"`);
      }
    );

    showStatus('success', `Removed ${removed.length} duplicate copy(s). Re-analyzing playlist...`);
    await handleAnalyzePlaylist();
  } catch (err) {
    showStatus('error', `Failed to remove duplicates: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

function renderGenresView(genres) {
  elements.genresListContainer.innerHTML = '';
  const genreKeys = Object.keys(genres);

  if (genreKeys.length === 0) {
    elements.genresListContainer.innerHTML = '<div style="font-size:11px;color:#717171;">No categories detected.</div>';
    return;
  }

  genreKeys.forEach((genreName) => {
    const videos = genres[genreName];
    const card = document.createElement('div');
    card.className = 'genre-group-card';

    const header = document.createElement('div');
    header.className = 'genre-header';
    const iconSvg = getGenreIconSvg(genreName);
    header.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        ${iconSvg}
        <span class="genre-title">${escapeHtml(genreName)} (${videos.length})</span>
      </div>
      <button class="btn btn-outline btn-xs btn-create-genre-pl">
        <i data-lucide="plus" style="width:11px;height:11px;"></i>
        Create Playlist
      </button>
    `;

    const createBtn = header.querySelector('.btn-create-genre-pl');
    createBtn.addEventListener('click', () => handleCreateSingleGenrePlaylist(genreName, videos));
    card.appendChild(header);

    const videoListEl = document.createElement('div');
    videoListEl.className = 'genre-video-list';

    videos.forEach((v) => {
      const row = document.createElement('div');
      row.className = 'genre-item-row';

      const rowHeader = document.createElement('div');
      rowHeader.className = 'genre-item-header';
      rowHeader.innerHTML = `
        <span class="genre-item-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</span>
        <div class="genre-item-actions" style="display:flex; gap:4px; align-items:center;">
          <select class="genre-move-select" title="Move to another category">
            <option value="" disabled selected>Move ▾</option>
            <option value="Anime & Manga">Anime & Manga</option>
            <option value="Tech & Programming">Tech</option>
            <option value="Music & Audio">Music</option>
            <option value="Education & Science">Education</option>
            <option value="Gaming & Esports">Gaming</option>
            <option value="Podcasts & Talks">Podcasts</option>
            <option value="Business & Finance">Business</option>
            <option value="Fitness & Health">Fitness</option>
            <option value="Entertainment & Cinema">Entertainment</option>
            <option value="Lifestyle & Other">Other</option>
          </select>
          <button class="summary-toggle-btn">
            <i data-lucide="lightbulb" style="width:10px;height:10px;"></i>
            Summary
          </button>
        </div>
      `;

      const moveSelect = rowHeader.querySelector('.genre-move-select');
      moveSelect.addEventListener('change', (e) => {
        const targetGenre = e.target.value;
        if (!targetGenre || targetGenre === genreName) return;
        moveVideoToGenre(v, genreName, targetGenre);
      });

      const summaryBtn = rowHeader.querySelector('.summary-toggle-btn');
      const summaryBox = document.createElement('div');
      summaryBox.className = 'video-summary-box hidden';

      summaryBtn.addEventListener('click', async () => {
        if (!summaryBox.classList.contains('hidden')) {
          summaryBox.classList.add('hidden');
          summaryBtn.innerHTML = `
            <i data-lucide="lightbulb" style="width:10px;height:10px;"></i>
            Summary
          `;
          refreshIcons();
          return;
        }

        summaryBtn.textContent = 'Loading...';
        summaryBox.classList.remove('hidden');
        summaryBox.textContent = 'Analyzing video metadata...';

        try {
          const summaryText = await summarizeVideoContent(v, v.metaDetails);
          summaryBox.textContent = summaryText;
          summaryBtn.textContent = 'Hide';
        } catch (err) {
          summaryBox.textContent = 'Could not generate summary.';
          summaryBtn.innerHTML = `
            <i data-lucide="lightbulb" style="width:10px;height:10px;"></i>
            Summary
          `;
          refreshIcons();
        }
      });

      row.appendChild(rowHeader);
      row.appendChild(summaryBox);
      videoListEl.appendChild(row);
    });

    card.appendChild(videoListEl);
    elements.genresListContainer.appendChild(card);
  });

  refreshIcons();
}

function moveVideoToGenre(video, fromGenre, toGenre) {
  if (!state.analyzedGenres[fromGenre]) return;
  state.analyzedGenres[fromGenre] = state.analyzedGenres[fromGenre].filter((v) => v.videoId !== video.videoId);
  if (state.analyzedGenres[fromGenre].length === 0) {
    delete state.analyzedGenres[fromGenre];
  }
  if (!state.analyzedGenres[toGenre]) {
    state.analyzedGenres[toGenre] = [];
  }
  state.analyzedGenres[toGenre].push(video);
  renderGenresView(state.analyzedGenres);
  showStatus('success', `Moved "${video.title.slice(0, 30)}..." to ${toGenre}.`);
}

async function handleCreateSingleGenrePlaylist(genreName, videos) {
  if (!videos || videos.length === 0) return;

  const title = `${state.analyzedPlaylistTitle} - ${genreName}`;

  setControlsDisabled(true);
  showStatus('loading', `Creating playlist "${title}" with ${videos.length} videos...`);

  try {
    const created = await createNewPlaylist(state.authToken, {
      title,
      description: `Auto-organized ${genreName} videos from ${state.analyzedPlaylistTitle}`,
      privacyStatus: 'private'
    });

    const videoIds = videos.map((v) => v.videoId);
    await addVideosToPlaylist(state.authToken, created.id, videoIds, (p) => {
      const percent = Math.round((p.currentIndex / p.total) * 100);
      showProgress(percent, p.total, `Adding [${p.currentIndex}/${p.total}] to ${title}`);
    });

    elements.btnViewCreatedPlaylist.href = `https://www.youtube.com/playlist?list=${created.id}`;
    elements.statusActionArea.classList.remove('hidden');
    showStatus('success', `Created playlist "${title}" with ${videos.length} videos.`);
    loadPlaylists(true);
  } catch (err) {
    showStatus('error', `Failed to create genre playlist: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

async function handleSplitAllGenres() {
  const genreKeys = Object.keys(state.analyzedGenres);
  if (genreKeys.length === 0) {
    showStatus('warning', 'No genre categories available to split.');
    return;
  }

  setControlsDisabled(true);

  for (let i = 0; i < genreKeys.length; i++) {
    const genreName = genreKeys[i];
    const videos = state.analyzedGenres[genreName];
    const title = `${state.analyzedPlaylistTitle} - ${genreName}`;

    showStatus('loading', `[${i + 1}/${genreKeys.length}] Creating "${title}" (${videos.length} videos)...`);

    try {
      const created = await createNewPlaylist(state.authToken, {
        title,
        description: `Auto-organized ${genreName} videos from ${state.analyzedPlaylistTitle}`,
        privacyStatus: 'private'
      });

      const videoIds = videos.map((v) => v.videoId);
      await addVideosToPlaylist(state.authToken, created.id, videoIds);
    } catch (err) {
      console.warn(`Error creating genre playlist for ${genreName}:`, err);
    }
  }

  showStatus('success', `Successfully organized and split ${genreKeys.length} genre playlists.`);
  loadPlaylists(true);
  setControlsDisabled(false);
}

// ==================== CROSS-PLAYLIST DUPLICATE SCANNER ====================

async function handleScanCrossDuplicates() {
  if (!state.authToken) {
    try {
      state.authToken = await getAccessToken(true);
    } catch (err) {
      showStatus('error', `Sign in required: ${err.message}`);
      return;
    }
  }

  setControlsDisabled(true);
  showStatus('loading', 'Scanning all user playlists for duplicates...');

  try {
    const { playlists, crossDuplicates } = await scanAllPlaylistsForDuplicates(state.authToken, (p) => {
      const percent = Math.round((p.currentIndex / p.total) * 100);
      showProgress(percent, p.total, `Scanning [${p.currentIndex}/${p.total}]: "${p.playlistTitle}"`);
    });

    state.analyzedCrossDuplicates = crossDuplicates;
    renderCrossDuplicatesView(crossDuplicates);

    elements.crossDuplicatesResultsSection.classList.remove('hidden');

    if (crossDuplicates.length === 0) {
      showStatus('success', `Scan complete across ${playlists.length} playlists! No duplicate videos found across different playlists.`);
    } else {
      showStatus('warning', `Found ${crossDuplicates.length} video(s) that exist in multiple playlists!`);
    }
  } catch (err) {
    showStatus('error', `Cross-playlist scan failed: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

function renderCrossDuplicatesView(crossDuplicates) {
  elements.crossDuplicatesListContainer.innerHTML = '';
  elements.crossDupCountBadge.textContent = `${crossDuplicates.length} found`;

  if (crossDuplicates.length === 0) {
    elements.crossDuplicatesListContainer.innerHTML = '<div style="color:#2ba640;font-size:11px;padding:8px;text-align:center;">Clean. No videos exist in multiple playlists.</div>';
    elements.crossDuplicateActionsBar.classList.add('hidden');
    return;
  }

  elements.crossDuplicateActionsBar.classList.remove('hidden');

  crossDuplicates.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'cross-dup-card';

    // Main header info
    const mainInfo = document.createElement('div');
    mainInfo.className = 'cross-dup-main';
    mainInfo.innerHTML = `
      <img src="${item.thumbnailUrl}" class="cross-dup-thumb" alt="Thumbnail">
      <div class="cross-dup-info">
        <div class="cross-dup-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="cross-dup-meta">${item.appearances.length} copies across ${new Set(item.appearances.map(a => a.playlistId)).size} playlists</div>
      </div>
    `;
    card.appendChild(mainInfo);

    // List of playlists this video belongs to
    const appBox = document.createElement('div');
    appBox.className = 'cross-appearances-box';

    item.appearances.forEach((app, idx) => {
      const row = document.createElement('div');
      row.className = 'cross-app-row';
      row.innerHTML = `
        <span class="cross-app-name" title="${escapeHtml(app.playlistTitle)}">
          ${idx === 0 ? '<strong>(Original)</strong> ' : ''}${escapeHtml(app.playlistTitle)}
        </span>
        <div class="cross-app-actions">
          <button class="btn-keep-only" title="Keep in this playlist and remove from all others">Keep Only</button>
          <button class="btn-remove-from-pl" title="Remove copy from this playlist">Remove</button>
        </div>
      `;

      const keepBtn = row.querySelector('.btn-keep-only');
      keepBtn.addEventListener('click', () => handleResolveCrossSingle(item, app.playlistItemId, app.playlistTitle));

      const removeBtn = row.querySelector('.btn-remove-from-pl');
      removeBtn.addEventListener('click', () => handleDeleteSingleCrossAppearance(item, app.playlistItemId, app.playlistTitle));

      appBox.appendChild(row);
    });

    card.appendChild(appBox);
    elements.crossDuplicatesListContainer.appendChild(card);
  });

  refreshIcons();
}

async function handleResolveCrossSingle(videoItem, keepPlaylistItemId, keepPlaylistTitle) {
  setControlsDisabled(true);
  showStatus('loading', `Cleaning up duplicate copies of "${videoItem.title.slice(0, 25)}..."...`);

  try {
    const { removed } = await resolveCrossDuplicatesForVideo(state.authToken, videoItem, keepPlaylistItemId);
    
    state.analyzedCrossDuplicates = state.analyzedCrossDuplicates.filter((v) => v.videoId !== videoItem.videoId);
    renderCrossDuplicatesView(state.analyzedCrossDuplicates);

    showStatus('success', `Kept "${videoItem.title.slice(0, 25)}..." in "${keepPlaylistTitle}" and removed ${removed.length} duplicate copy(s).`);
  } catch (err) {
    showStatus('error', `Failed to cleanup duplicates: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

async function handleDeleteSingleCrossAppearance(videoItem, playlistItemId, playlistTitle) {
  setControlsDisabled(true);
  showStatus('loading', `Removing copy from "${playlistTitle}"...`);

  try {
    await deletePlaylistItem(state.authToken, playlistItemId);

    videoItem.appearances = videoItem.appearances.filter((a) => a.playlistItemId !== playlistItemId);
    if (new Set(videoItem.appearances.map(a => a.playlistId)).size <= 1) {
      state.analyzedCrossDuplicates = state.analyzedCrossDuplicates.filter((v) => v.videoId !== videoItem.videoId);
    }

    renderCrossDuplicatesView(state.analyzedCrossDuplicates);
    showStatus('success', `Removed copy from "${playlistTitle}".`);
  } catch (err) {
    showStatus('error', `Failed to delete from playlist: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

async function handleBulkResolveCrossDuplicates() {
  if (state.analyzedCrossDuplicates.length === 0) return;

  setControlsDisabled(true);
  showProgress(0, state.analyzedCrossDuplicates.length, 'Cleaning all cross-playlist duplicates...');

  try {
    const { removed, failed } = await bulkResolveAllCrossDuplicates(
      state.authToken,
      state.analyzedCrossDuplicates,
      (p) => {
        const percent = Math.round((p.current / p.total) * 100);
        showProgress(percent, p.total, `Cleaning [${p.current}/${p.total}]: "${p.videoTitle}" from "${p.fromPlaylist}"`);
      }
    );

    state.analyzedCrossDuplicates = [];
    renderCrossDuplicatesView([]);

    if (failed === 0) {
      showStatus('success', `Removed ${removed} cross-playlist duplicate copies! All videos now kept in their primary playlist only.`);
    } else {
      showStatus('warning', `Removed ${removed} copies. ${failed} failed.`);
    }
  } catch (err) {
    showStatus('error', `Bulk resolution failed: ${err.message}`);
  } finally {
    setControlsDisabled(false);
  }
}

// Close Saved Tabs button action
async function handleCloseSavedTabsNow() {
  const tabsToClose = state.detectedTabs
    .filter((t) => state.justSavedVideoIds.has(t.videoId) || state.existingPlaylistVideoIds.has(t.videoId))
    .map((t) => t.tabId);

  if (tabsToClose.length === 0) {
    showStatus('info', 'No saved tabs found to close.');
    return;
  }

  await chrome.tabs.remove(tabsToClose);
  await refreshTabs();
  showStatus('success', `Closed ${tabsToClose.length} saved YouTube tab(s).`);
}

function handleOpenInstantQueue() {
  const selectedTabs = state.detectedTabs.filter((t) => state.selectedTabIds.has(t.tabId));
  if (selectedTabs.length === 0) {
    showStatus('warning', 'Please select at least one YouTube tab.');
    return;
  }

  const videoIds = selectedTabs.map((t) => t.videoId);
  const queueUrl = buildYouTubeQueueUrl(videoIds);

  if (!queueUrl) {
    showStatus('error', 'Could not generate YouTube queue URL.');
    return;
  }

  chrome.tabs.create({ url: queueUrl });
  showStatus('success', `Launched instant YouTube queue with ${videoIds.length} videos in a new tab.`);
}

async function copySelectedLinks(format) {
  const selectedTabs = state.detectedTabs.filter((t) => state.selectedTabIds.has(t.tabId));
  if (selectedTabs.length === 0) {
    showStatus('warning', 'No tabs selected to copy.');
    return;
  }

  let textToCopy = '';

  switch (format) {
    case 'urls':
      textToCopy = selectedTabs.map((t) => t.url).join('\n');
      break;
    case 'ids':
      textToCopy = selectedTabs.map((t) => t.videoId).join('\n');
      break;
    case 'markdown':
      textToCopy = selectedTabs.map((t) => `- [${t.title}](${t.url})`).join('\n');
      break;
    case 'json':
      textToCopy = JSON.stringify(
        selectedTabs.map((t) => ({ title: t.title, videoId: t.videoId, url: t.url })),
        null,
        2
      );
      break;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    showStatus('success', `Copied ${selectedTabs.length} items to clipboard (${format.toUpperCase()}).`);
  } catch (err) {
    showStatus('error', 'Failed to copy to clipboard.');
  }
}

function parsePlaylistId(input) {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{10,40}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const list = url.searchParams.get('list');
    if (list) return list;
  } catch {
    return null;
  }
  return null;
}

function showStatus(type, message) {
  elements.statusNotification.classList.remove('hidden');
  elements.progressBarContainer.classList.add('hidden');

  const icons = {
    loading: '<i data-lucide="loader-2" class="spinner" style="width:14px;height:14px;"></i>',
    success: '<i data-lucide="check-circle-2" style="width:14px;height:14px;color:#2ba640;"></i>',
    warning: '<i data-lucide="alert-triangle" style="width:14px;height:14px;color:#f9ab00;"></i>',
    error: '<i data-lucide="x-circle" style="width:14px;height:14px;color:#ff4d4f;"></i>',
    info: '<i data-lucide="info" style="width:14px;height:14px;color:#3ea6ff;"></i>'
  };

  elements.statusIcon.innerHTML = icons[type] || icons.info;
  elements.statusMessage.textContent = message;
  elements.statusDetails.textContent = '';
  refreshIcons();
}

function showProgress(percent, total, detailsText) {
  elements.statusNotification.classList.remove('hidden');
  elements.progressBarContainer.classList.remove('hidden');
  elements.progressBarFill.style.width = `${percent}%`;
  elements.statusIcon.innerHTML = '<i data-lucide="loader-2" class="spinner" style="width:14px;height:14px;"></i>';
  elements.statusMessage.textContent = `Progress (${percent}%)...`;
  elements.statusDetails.textContent = detailsText;
  refreshIcons();
}

function setControlsDisabled(disabled) {
  elements.btnSaveToPlaylist.disabled = disabled;
  elements.btnOpenQueue.disabled = disabled;
  elements.btnRefreshTabs.disabled = disabled;
  elements.btnAnalyzePlaylist.disabled = disabled;
  elements.btnRemoveDuplicates.disabled = disabled;
  elements.btnSplitAllGenres.disabled = disabled;
  if (elements.btnScanCrossDuplicates) {
    elements.btnScanCrossDuplicates.disabled = disabled;
  }
  if (elements.btnBulkResolveCrossDuplicates) {
    elements.btnBulkResolveCrossDuplicates.disabled = disabled;
  }
}

async function openSettingsModal() {
  if (elements.redirectUriInput) {
    elements.redirectUriInput.value = chrome.identity.getRedirectURL();
  }
  await checkChromeAiAvailability();
  if (elements.selectAiProvider) {
    updateAiProviderVisibility(elements.selectAiProvider.value);
  }
  document.body.classList.add('modal-open');
  if (elements.settingsModal) {
    elements.settingsModal.classList.remove('hidden');
  }
  refreshIcons();
}

function updateAiProviderVisibility(provider) {
  if (elements.geminiKeyGroup) {
    elements.geminiKeyGroup.classList.toggle('hidden', provider !== 'gemini');
  }
  if (elements.chromeAiStatus) {
    elements.chromeAiStatus.classList.toggle('hidden', provider !== 'chrome');
  }
}

async function checkChromeAiAvailability() {
  if (!elements.chromeAiStatus) return;
  if (!globalThis.LanguageModel) {
    elements.chromeAiStatus.innerHTML = '<span style="color:#eab308;">Prompt API not detected in this browser. Smart metadata fallback active.</span>';
    return;
  }
  try {
    const availability = await LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }]
    });
    if (availability === 'readily' || availability === 'available') {
      elements.chromeAiStatus.innerHTML = '<span style="color:#2ba640;">Chrome On-Device AI is ready & available.</span>';
    } else if (availability === 'after-download') {
      elements.chromeAiStatus.innerHTML = '<span style="color:#3b82f6;">Model will download on first summary request.</span>';
    } else {
      elements.chromeAiStatus.innerHTML = '<span style="color:#aaa;">Status: ' + availability + '</span>';
    }
  } catch (err) {
    elements.chromeAiStatus.innerHTML = '<span style="color:#888;">Prompt API ready with metadata fallback.</span>';
  }
}

function closeSettingsModal() {
  document.body.classList.remove('modal-open');
  if (elements.settingsModal) {
    elements.settingsModal.classList.add('hidden');
  }
}

async function saveCustomSettings() {
  const customClientId = elements.inputCustomClientId.value.trim();
  const customToken = elements.inputCustomToken.value.trim();
  const geminiApiKey = elements.inputGeminiApiKey.value.trim();
  const aiProvider = elements.selectAiProvider ? elements.selectAiProvider.value : 'chrome';

  await chrome.storage.sync.set({ customClientId, customToken, geminiApiKey, aiProvider });
  showStatus('success', 'Settings saved successfully.');
  closeSettingsModal();
  await checkAuth(true);
}

async function loadSavedOptions() {
  const { optCloseTabs, customClientId, customToken, geminiApiKey, aiProvider } = await chrome.storage.sync.get([
    'optCloseTabs',
    'customClientId',
    'customToken',
    'geminiApiKey',
    'aiProvider'
  ]);

  if (optCloseTabs !== undefined) {
    elements.optCloseTabs.checked = Boolean(optCloseTabs);
  }
  if (customClientId) {
    elements.inputCustomClientId.value = customClientId;
  }
  if (customToken) {
    elements.inputCustomToken.value = customToken;
  }
  if (geminiApiKey) {
    elements.inputGeminiApiKey.value = geminiApiKey;
  }
  if (aiProvider && elements.selectAiProvider) {
    elements.selectAiProvider.value = aiProvider;
  }
  if (elements.selectAiProvider) {
    updateAiProviderVisibility(elements.selectAiProvider.value);
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
