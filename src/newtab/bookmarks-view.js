(function(root) {
  'use strict';

  function noop() {}

  function getOption(options, key, fallback) {
    if (options && Object.prototype.hasOwnProperty.call(options, key)) {
      return options[key];
    }
    return fallback;
  }

  function getFunction(options, key, fallback) {
    const value = getOption(options, key, fallback || noop);
    return typeof value === 'function' ? value : (fallback || noop);
  }

  function getBookmarksSignature(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }
    return items.map((item, index) => {
      const id = item && item.id ? String(item.id) : '';
      const type = item && item.type ? String(item.type) : '';
      const title = item && item.title ? String(item.title) : '';
      const url = item && item.url ? String(item.url) : '';
      const themeUrl = item && item.themeUrl ? String(item.themeUrl) : '';
      return `${index}::${id}::${type}::${title}::${url}::${themeUrl}`;
    }).join('\n');
  }

  function getBookmarkCacheKey(item) {
    if (!item) {
      return '';
    }
    const id = item.id ? String(item.id) : '';
    const type = item.type ? String(item.type) : '';
    const title = item.title ? String(item.title) : '';
    const url = item.url ? String(item.url) : '';
    const themeUrl = item.themeUrl ? String(item.themeUrl) : '';
    return `${id}::${type}::${title}::${url}::${themeUrl}`;
  }

  function applyBookmarkCardMetadata(card, item, index) {
    if (!card || !item || typeof card.setAttribute !== 'function') {
      return;
    }
    const bookmarkId = item.id ? String(item.id) : '';
    const parentId = item.parentId ? String(item.parentId) : '';
    const itemIndex = Number(item.index);
    card.draggable = false;
    card._xBookmarkItem = item;
    card._xBookmarkPageIndex = Number.isFinite(index) ? index : 0;
    card.setAttribute('data-bookmark-id', bookmarkId);
    card.setAttribute('data-bookmark-type', item.type ? String(item.type) : '');
    card.setAttribute('data-bookmark-parent-id', parentId);
    card.setAttribute('data-bookmark-index', Number.isFinite(itemIndex) ? String(itemIndex) : '');
    card.setAttribute(
      'data-bookmark-draggable',
      bookmarkId && parentId && Number.isFinite(itemIndex) ? 'true' : 'false'
    );
  }

  function createBookmarksView(options) {
    const documentObj = getOption(options, 'documentObj', root.document);
    const windowObj = getOption(options, 'windowObj', root.window);
    const grid = getOption(options, 'grid', null);
    const cards = Array.isArray(getOption(options, 'cards', null))
      ? getOption(options, 'cards', null)
      : [];
    let folderIconsVisible = getOption(options, 'folderIconsVisible', true) !== false;
    const cardElementCache = getOption(options, 'cardElementCache', new Map());
    const t = getFunction(options, 't', function(key, fallback) {
      return fallback || key || '';
    });
    const formatMessage = getFunction(options, 'formatMessage', function(key, fallback, values) {
      let text = fallback || key || '';
      Object.keys(values || {}).forEach((name) => {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), values[name]);
      });
      return text;
    });
    const sanitizeDisplayText = getFunction(options, 'sanitizeDisplayText', function(value) {
      return String(value || '');
    });
    const getHostFromUrl = getFunction(options, 'getHostFromUrl', function() {
      return '';
    });
    const getSiteDisplayName = getFunction(options, 'getSiteDisplayName', function(host, title) {
      return title || host || '';
    });
    const getUrlDisplay = getFunction(options, 'getUrlDisplay', function(url) {
      return url || '';
    });
    const getRiSvg = getFunction(options, 'getRiSvg', function() {
      return '';
    });
    const getFigmaFolderSvg = getFunction(options, 'getFigmaFolderSvg', function() {
      return '';
    });
    const initFolderPathMorph = getFunction(options, 'initFolderPathMorph');
    const playFolderPathMorph = getFunction(options, 'playFolderPathMorph');
    const stableHashCode = getFunction(options, 'stableHashCode', function(value) {
      const text = String(value || '');
      let hash = 0;
      for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    });
    const normalizeHost = getFunction(options, 'normalizeHost', function(host) {
      return host || '';
    });
    const attachFaviconWithFallbacks = getFunction(options, 'attachFaviconWithFallbacks');
    const isLocalNetworkHost = getFunction(options, 'isLocalNetworkHost', function() {
      return false;
    });
    const getChromeFaviconUrl = getFunction(options, 'getChromeFaviconUrl', function() {
      return '';
    });
    const getBrowserPageFaviconUrl = getFunction(options, 'getBrowserPageFaviconUrl', function() {
      return '';
    });
    const getImmediateThemeForSuggestion = getFunction(options, 'getImmediateThemeForSuggestion', function() {
      return null;
    });
    const queueThemeForTarget = getFunction(options, 'queueThemeForTarget');
    const applyCardTheme = getFunction(options, 'applyCardTheme');
    const shouldDelayHoverFromRecent = getFunction(options, 'shouldDelayHoverFromRecent', function() {
      return false;
    });
    const shouldSuppressHover = getFunction(options, 'shouldSuppressHover', function() {
      return false;
    });
    const bindCursorTooltip = getFunction(options, 'bindCursorTooltip');
    const hideCursorTooltip = getFunction(options, 'hideCursorTooltip');
    const openFolder = getFunction(options, 'openFolder');
    const openFolderMenu = getFunction(options, 'openFolderMenu');
    const copyUrl = getFunction(options, 'copyUrl', function() {
      return Promise.resolve(false);
    });
    const navigateToUrl = getFunction(options, 'navigateToUrl');
    const openUrl = getFunction(options, 'openUrl', function(url) {
      navigateToUrl(url);
    });
    const onItemContextMenu = getFunction(options, 'onItemContextMenu');

    function shouldOpenUrlInBackground(event) {
      return Boolean(event && (event.metaKey || event.ctrlKey || Number(event.button) === 1));
    }

    function openBookmarkUrl(url, event) {
      openUrl(url, {
        openInBackgroundTab: shouldOpenUrlInBackground(event)
      });
    }

    function clear() {
      hideCursorTooltip();
      if (grid) {
        grid.innerHTML = '';
      }
      cards.length = 0;
    }

    function appendEmptyFolderState() {
      if (!grid || !documentObj) {
        return;
      }
      const emptyState = documentObj.createElement('div');
      emptyState.className = 'x-nt-bookmark-empty';
      emptyState.innerHTML = `${getRiSvg('ri-file-3-line', 'ri-size-16')}<span>${t('bookmarks_empty_folder', '暂无内容')}</span>`;
      grid.appendChild(emptyState);
    }

    function disposeCachedCard(card) {
      if (card && typeof card._xDisposeBookmarkCard === 'function') {
        card._xDisposeBookmarkCard();
      }
    }

    function syncCardElementCache(items) {
      const MAX_CACHE_SIZE = 1500;
      if (!cardElementCache) {
        return;
      }
      if (Array.isArray(items)) {
        const activeItemKeys = new Set(
          items.map(getBookmarkCacheKey).filter(Boolean)
        );
        cardElementCache.forEach((card, cacheKey) => {
          const key = String(cacheKey || '');
          const separatorIndex = key.indexOf('::');
          const itemKey = separatorIndex >= 0 ? key.slice(separatorIndex + 2) : '';
          if (!itemKey || !activeItemKeys.has(itemKey)) {
            disposeCachedCard(card);
            cardElementCache.delete(cacheKey);
          }
        });
      }
      if (cardElementCache.size <= MAX_CACHE_SIZE) {
        return;
      }
      const keys = Array.from(cardElementCache.keys());
      const removeCount = Math.max(1, cardElementCache.size - MAX_CACHE_SIZE);
      for (let i = 0; i < removeCount && i < keys.length; i += 1) {
        const cacheKey = keys[i];
        disposeCachedCard(cardElementCache.get(cacheKey));
        cardElementCache.delete(cacheKey);
      }
    }

    function isBookmarkTitleTruncated(titleElement) {
      if (!titleElement) {
        return false;
      }
      const scrollWidth = Number(titleElement.scrollWidth);
      const clientWidth = Number(titleElement.clientWidth);
      return Number.isFinite(scrollWidth) &&
        Number.isFinite(clientWidth) &&
        clientWidth > 0 &&
        scrollWidth > clientWidth + 1;
    }

    function getBrowserFaviconCandidateForBookmark(url, host) {
      const pageUrl = String(url || '').trim();
      if (!pageUrl) {
        return '';
      }
      if (!/^https?:\/\//i.test(pageUrl)) {
        return /^[a-z][a-z0-9+.-]*:/i.test(pageUrl)
          ? getChromeFaviconUrl(pageUrl)
          : '';
      }
      return host && isLocalNetworkHost(host)
        ? getChromeFaviconUrl(pageUrl)
        : '';
    }

    function getPrimaryFaviconCandidateForBookmark(url) {
      return getBrowserPageFaviconUrl(url);
    }

    function buildCard(item, index, state) {
      if (!item || (!item.url && item.type !== 'folder') || !documentObj) {
        return null;
      }
      const isTopbarMode = Boolean(state && state.viewMode === 'top');
      const menuMode = Boolean(state && state.menuMode);
      const isFolder = item.type === 'folder';
      const themeUrl = item.themeUrl || item.url || '';
      const host = item.host || getHostFromUrl(themeUrl) || '';
      const siteName = getSiteDisplayName(host, item.title);
      const titleText = item.title || siteName || (item.url ? getUrlDisplay(item.url) : t('bookmarks_heading', '书签'));
      const card = documentObj.createElement('div');
      card.className = 'x-nt-bookmark-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute(
        'data-bookmark-view-mode',
        isTopbarMode ? 'top' : 'grid'
      );
      card.draggable = false;
      if (isFolder) {
        card.classList.add('x-nt-bookmark-card--folder');
        if (menuMode) {
          card.setAttribute('aria-haspopup', 'menu');
          card.setAttribute('aria-expanded', 'false');
        }
      }
      card.title = titleText;
      card._xTitleText = titleText;
      card.setAttribute('data-cursor-tooltip', titleText);
      card.setAttribute('aria-label', formatMessage('open_prefix', '打开 {title}', {
        title: titleText
      }));
      card._xNoThemeTint = isFolder;

      const themeSuggestion = { type: 'bookmark', url: themeUrl, title: titleText };
      const immediateTheme = isTopbarMode
        ? null
        : getImmediateThemeForSuggestion(themeSuggestion);
      card._xTheme = immediateTheme;
      card._xHost = host;
      if (!isTopbarMode) {
        applyCardTheme(card, immediateTheme, host);
      }
      if (!isTopbarMode && themeUrl) {
        queueThemeForTarget(card, themeSuggestion, (theme) => {
          if (!card.isConnected) {
            return;
          }
          card._xTheme = theme || card._xTheme;
          applyCardTheme(card, card._xTheme, host);
        }, { priority: index < 4 ? 0 : 2 });
      }

      let icon = null;
      let folderIcon = null;
      if (isFolder) {
        folderIcon = documentObj.createElement('span');
        folderIcon.className = 'x-nt-bookmark-icon x-nt-bookmark-icon--figma';
        folderIcon.innerHTML = getFigmaFolderSvg(`${item.id || 'folder'}-${index}`);
        folderIcon.setAttribute('aria-hidden', 'true');
        if (!isTopbarMode) {
          initFolderPathMorph(folderIcon);
        }
        icon = folderIcon;
      } else {
        const favicon = documentObj.createElement('img');
        favicon.className = 'x-nt-bookmark-icon';
        favicon.alt = siteName || t('site_icon_alt', '站点');
        favicon.width = 22;
        favicon.height = 22;
        favicon.decoding = 'async';
        favicon.loading = index < 4 ? 'eager' : 'lazy';
        if (index < 4) {
          favicon.fetchPriority = 'high';
        }
        favicon.draggable = false;
        favicon.setAttribute('draggable', 'false');
        attachFaviconWithFallbacks(favicon, item.url, host, {
          primaryUrl: getPrimaryFaviconCandidateForBookmark(item.url),
          browserUrl: getBrowserFaviconCandidateForBookmark(item.url, host)
        });
        icon = favicon;
      }

      const title = documentObj.createElement('span');
      title.className = 'x-nt-bookmark-title';
      title.textContent = sanitizeDisplayText(titleText);

      card.appendChild(icon);
      card.appendChild(title);
      if (!isFolder && !isTopbarMode) {
        const copyButton = documentObj.createElement('button');
        let copyActionFocused = false;
        const setCopyActionVisible = (visible) => {
          if (visible) {
            card.setAttribute('data-bookmark-copy-action-visible', 'true');
          } else {
            card.removeAttribute('data-bookmark-copy-action-visible');
          }
        };
        copyButton.type = 'button';
        copyButton.className = 'x-nt-bookmark-copy-action';
        copyButton.innerHTML = getRiSvg('ri-file-copy-line', 'ri-size-16');
        copyButton.setAttribute('aria-label', t('bookmarks_copy_url', 'Copy link'));
        copyButton.addEventListener('pointerenter', () => {
          hideCursorTooltip();
          setCopyActionVisible(true);
        });
        copyButton.addEventListener('pointerleave', () => {
          if (!copyActionFocused) {
            setCopyActionVisible(false);
          }
        });
        copyButton.addEventListener('focus', () => {
          copyActionFocused = true;
          hideCursorTooltip();
          setCopyActionVisible(true);
        });
        copyButton.addEventListener('blur', () => {
          copyActionFocused = false;
          setCopyActionVisible(false);
        });
        copyButton.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
        });
        copyButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          hideCursorTooltip();
          Promise.resolve().then(() => copyUrl(item.url)).catch(noop);
        });
        copyButton.addEventListener('keydown', (event) => {
          event.stopPropagation();
        });
        card.appendChild(copyButton);
      }
      if (!isTopbarMode && isFolder &&
          Array.isArray(item.previewUrls) && item.previewUrls.length > 0) {
        const previewWrap = documentObj.createElement('span');
        previewWrap.className = 'x-nt-folder-preview';
        const maxPreview = Math.min(4, item.previewUrls.length);
        for (let i = 0; i < maxPreview; i += 1) {
          const url = item.previewUrls[i];
          if (!url) {
            continue;
          }
          let previewHost = '';
          try {
            previewHost = normalizeHost(new URL(url).hostname);
          } catch (error) {
            previewHost = '';
          }
          const previewFavicon = documentObj.createElement('img');
          previewFavicon.className = 'x-nt-folder-preview-favicon';
          previewFavicon.width = 24;
          previewFavicon.height = 24;
          const rotationSeed = stableHashCode(`${url}|${i}|${item.id || ''}`);
          const rotationDeg = ((rotationSeed % 13) - 6) * 0.5;
          previewFavicon.style.setProperty('--x-nt-folder-favicon-rot', `${rotationDeg.toFixed(2)}deg`);
          previewFavicon.style.zIndex = String(10 + i);
          previewFavicon.alt = '';
          previewFavicon.loading = 'eager';
          previewFavicon.decoding = 'async';
          previewFavicon.setAttribute('aria-hidden', 'true');
          previewFavicon.draggable = false;
          previewFavicon.setAttribute('draggable', 'false');
          attachFaviconWithFallbacks(previewFavicon, url, previewHost, {
            primaryUrl: getPrimaryFaviconCandidateForBookmark(url),
            browserUrl: getBrowserFaviconCandidateForBookmark(url, previewHost)
          });
          previewWrap.appendChild(previewFavicon);
        }
        card.appendChild(previewWrap);
      }
      let hoverIntentTimer = null;
      let isHoverVisualActive = false;
      let isMenuVisualLocked = false;
      let isFolderExpanded = false;
      const clearHoverIntentTimer = () => {
        if (hoverIntentTimer !== null && windowObj) {
          windowObj.clearTimeout(hoverIntentTimer);
          hoverIntentTimer = null;
        }
      };
      const shouldKeepMenuVisualActive = () => Boolean(
        isFolder &&
        menuMode &&
        (isMenuVisualLocked || card.getAttribute('aria-expanded') === 'true')
      );
      const isHoverSuppressed = (event) => shouldSuppressHover(card, event) === true;
      const setFolderExpanded = (active, visualOptions) => {
        const nextActive = Boolean(active);
        if (!folderIcon || isFolderExpanded === nextActive) {
          return;
        }
        isFolderExpanded = nextActive;
        card.classList.toggle('x-nt-bookmark-card--folder-expanded', nextActive);
        playFolderPathMorph(folderIcon, nextActive, visualOptions);
      };
      const syncFolderExpandedState = (visualOptions) => {
        setFolderExpanded(
          shouldKeepMenuVisualActive() || (folderIconsVisible && isHoverVisualActive),
          visualOptions
        );
      };
      const setHoverVisualActive = (active, visualOptions) => {
        const nextActive = Boolean(active);
        if (isHoverVisualActive === nextActive) {
          syncFolderExpandedState(visualOptions);
          return;
        }
        isHoverVisualActive = nextActive;
        card.classList.toggle('x-nt-bookmark-card--hover', nextActive);
        syncFolderExpandedState(visualOptions);
      };
      const setMenuVisualLocked = (active, visualOptions) => {
        const nextActive = Boolean(active);
        if (isMenuVisualLocked === nextActive) {
          if (nextActive) {
            setHoverVisualActive(true, visualOptions);
            setFolderExpanded(true, visualOptions);
          }
          return;
        }
        isMenuVisualLocked = nextActive;
        clearHoverIntentTimer();
        setHoverVisualActive(nextActive, visualOptions);
        if (nextActive) {
          setFolderExpanded(true, visualOptions);
        }
      };
      const deactivateBookmarkHoverVisual = () => {
        clearHoverIntentTimer();
        if (shouldKeepMenuVisualActive()) {
          setHoverVisualActive(true);
          return;
        }
        setHoverVisualActive(false);
      };
      card._xDeactivateBookmarkHoverVisual = deactivateBookmarkHoverVisual;
      card._xSyncBookmarkFolderExpandedState = syncFolderExpandedState;
      card._xResetBookmarkInteractionState = () => {
        clearHoverIntentTimer();
        isHoverVisualActive = false;
        isMenuVisualLocked = false;
        card.classList.remove('x-nt-bookmark-card--hover');
        card.removeAttribute('data-bookmark-copy-action-visible');
        setFolderExpanded(false);
      };
      if (isFolder && menuMode) {
        card._xSetBookmarkMenuVisualActive = setMenuVisualLocked;
      }
      const activateBookmarkHoverVisual = (event) => {
        if (isHoverSuppressed(event)) {
          clearHoverIntentTimer();
          setHoverVisualActive(false);
          return;
        }
        const pointerType = event && typeof event.pointerType === 'string' ? event.pointerType : '';
        if (!shouldDelayHoverFromRecent(pointerType)) {
          clearHoverIntentTimer();
          setHoverVisualActive(true);
          return;
        }
        clearHoverIntentTimer();
        hoverIntentTimer = windowObj.setTimeout(() => {
          hoverIntentTimer = null;
          setHoverVisualActive(true);
        }, getOption(options, 'hoverDelayFromRecentMs', 180));
      };
      card.addEventListener('pointerenter', (event) => {
        activateBookmarkHoverVisual(event);
      });
      card.addEventListener('pointerleave', () => {
        deactivateBookmarkHoverVisual();
      });
      card.addEventListener('pointercancel', () => {
        deactivateBookmarkHoverVisual();
      });
      card.addEventListener('focus', () => {
        clearHoverIntentTimer();
        setHoverVisualActive(true);
      });
      card.addEventListener('blur', () => {
        deactivateBookmarkHoverVisual();
      });
      card.addEventListener('pointerdown', () => {
        clearHoverIntentTimer();
        if (isHoverSuppressed()) {
          setHoverVisualActive(false);
        }
      });
      card.addEventListener('dragstart', (event) => {
        event.preventDefault();
      });
      card.addEventListener('contextmenu', (event) => {
        onItemContextMenu({
          event,
          item,
          element: card,
          sourceKind: 'card'
        });
      });
      bindCursorTooltip(card, () => card._xTitleText || titleText, {
        maxWidth: 460,
        shouldShow: (_target, event) => {
          const eventTarget = event && event.target;
          if (eventTarget && typeof eventTarget.closest === 'function' &&
              eventTarget.closest('.x-nt-bookmark-copy-action')) {
            return false;
          }
          return isBookmarkTitleTruncated(title);
        }
      });
      card.addEventListener('click', (event) => {
        if (card._xBookmarkSuppressClick) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        hideCursorTooltip();
        if (isFolder) {
          if (menuMode) {
            setMenuVisualLocked(true);
            openFolderMenu(item, card);
            return;
          }
          setFolderExpanded(true);
          openFolder(item.id);
          return;
        }
        openBookmarkUrl(item.url, event);
      });
      card.addEventListener('auxclick', (event) => {
        if (isFolder || !event || Number(event.button) !== 1) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        hideCursorTooltip();
        openBookmarkUrl(item.url, event);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (isFolder) {
            if (menuMode) {
              setMenuVisualLocked(true);
              openFolderMenu(item, card);
              return;
            }
            setFolderExpanded(true);
            openFolder(item.id);
            return;
          }
          openBookmarkUrl(item.url, event);
        }
      });
      card._xDisposeBookmarkCard = () => {
        clearHoverIntentTimer();
        if (card._xBookmarkSuppressClickTimer && windowObj &&
            typeof windowObj.clearTimeout === 'function') {
          windowObj.clearTimeout(card._xBookmarkSuppressClickTimer);
          card._xBookmarkSuppressClickTimer = 0;
        }
      };
      return card;
    }

    function render(items, state) {
      const normalizedItems = Array.isArray(items) ? items : [];
      const previousSignature = state && typeof state.signature === 'string' ? state.signature : '';
      const folderId = state && state.folderId ? String(state.folderId) : '';
      const rootFolderId = state && state.rootFolderId ? String(state.rootFolderId) : '1';
      const requestedViewMode = state && state.viewMode;
      const viewMode = requestedViewMode === 'list' || requestedViewMode === 'top'
        ? requestedViewMode
        : 'folder';
      const menuMode = Boolean(state && state.menuMode);
      const isAtRoot = String(folderId || '') === String(rootFolderId || '1');
      const nextSignature = `${folderId}##${viewMode}##${getBookmarksSignature(normalizedItems)}`;
      if (nextSignature === previousSignature) {
        if (normalizedItems.length === 0 && !isAtRoot) {
          clear();
          appendEmptyFolderState();
        }
        return {
          changed: false,
          count: normalizedItems.length,
          isAtRoot,
          signature: nextSignature
        };
      }
      clear();
      if (normalizedItems.length === 0) {
        if (!isAtRoot) {
          appendEmptyFolderState();
        }
        return {
          changed: true,
          count: 0,
          isAtRoot,
          signature: nextSignature
        };
      }
      const fragment = grid && documentObj &&
          typeof documentObj.createDocumentFragment === 'function'
        ? documentObj.createDocumentFragment()
        : null;
      const renderTarget = fragment || grid;
      normalizedItems.forEach((item, index) => {
        const cacheKey = `${viewMode}::${getBookmarkCacheKey(item)}`;
        let card = cacheKey && cardElementCache ? cardElementCache.get(cacheKey) : null;
        if (!card) {
          card = buildCard(item, index, { viewMode, menuMode });
          if (card && cacheKey && cardElementCache) {
            cardElementCache.set(cacheKey, card);
          }
        }
        if (card && renderTarget) {
          if (typeof card._xResetBookmarkInteractionState === 'function') {
            card._xResetBookmarkInteractionState();
          }
          applyBookmarkCardMetadata(card, item, index);
          if (viewMode !== 'top') {
            applyCardTheme(card, card._xTheme, card._xHost || '');
          }
          cards.push(card);
          renderTarget.appendChild(card);
        }
      });
      if (fragment && grid) {
        grid.appendChild(fragment);
      }
      return {
        changed: true,
        count: normalizedItems.length,
        isAtRoot,
        signature: nextSignature
      };
    }

    function setFolderIconsVisible(value) {
      folderIconsVisible = value !== false;
      cards.forEach((card) => {
        if (card && typeof card._xSyncBookmarkFolderExpandedState === 'function') {
          card._xSyncBookmarkFolderExpandedState();
        }
      });
      return folderIconsVisible;
    }

    return {
      appendEmptyFolderState,
      buildCard,
      clear,
      render,
      getSignature: getBookmarksSignature,
      getCacheKey: getBookmarkCacheKey,
      setFolderIconsVisible,
      syncCardElementCache,
      getCards: function() {
        return cards;
      }
    };
  }

  root.LumnoNewtabBookmarksView = {
    createBookmarksView,
    getBookmarkCacheKey,
    getBookmarksSignature
  };
})(globalThis);
