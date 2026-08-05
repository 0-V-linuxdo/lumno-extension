(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSelectionTarget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const DEFAULT_GROUP_TITLE = 'AI \u67E5\u8BE2';
  const DEFAULT_GROUP_COLOR = 'blue';

  function getChromeApi(chromeApi) {
    return chromeApi || (typeof chrome !== 'undefined' ? chrome : null);
  }

  function getRuntimeError(api, fallback) {
    return api && api.runtime && api.runtime.lastError
      ? api.runtime.lastError.message || fallback
      : '';
  }

  function tryOpenWithSplitViewAdapter(adapter, options, callback) {
    const done = typeof callback === 'function' ? callback : () => {};
    if (!adapter || typeof adapter.openTarget !== 'function') {
      done(null);
      return;
    }
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      done(result && result.ok ? { ...result, mode: 'splitView' } : null);
    };
    try {
      const returned = adapter.openTarget(options || {}, finish);
      if (returned && typeof returned.then === 'function') {
        returned.then(finish).catch(() => finish(null));
      } else if (returned && typeof returned === 'object') {
        finish(returned);
      }
    } catch (e) {
      finish(null);
    }
  }

  function findExistingSelectionGroup(chromeApi, windowId, title, callback) {
    const api = getChromeApi(chromeApi);
    const done = typeof callback === 'function' ? callback : () => {};
    if (!api || !api.tabGroups || typeof api.tabGroups.query !== 'function') {
      done(null);
      return;
    }
    const queryInfo = { title: title || DEFAULT_GROUP_TITLE };
    if (typeof windowId === 'number') {
      queryInfo.windowId = windowId;
    }
    try {
      api.tabGroups.query(queryInfo, (groups) => {
        if (getRuntimeError(api, 'tab-group-query-failed')) {
          done(null);
          return;
        }
        const group = Array.isArray(groups)
          ? groups.find((item) => item && typeof item.id === 'number')
          : null;
        done(group || null);
      });
    } catch (e) {
      done(null);
    }
  }

  function getSourceSelectionGroup(chromeApi, sourceTab) {
    const api = getChromeApi(chromeApi);
    if (!sourceTab || typeof sourceTab.groupId !== 'number') {
      return null;
    }
    const ungroupedId = api && api.tabGroups &&
      typeof api.tabGroups.TAB_GROUP_ID_NONE === 'number'
      ? api.tabGroups.TAB_GROUP_ID_NONE
      : -1;
    if (sourceTab.groupId === ungroupedId) {
      return null;
    }
    return {
      id: sourceTab.groupId,
      preserve: true
    };
  }

  function resolveSelectionGroup(chromeApi, settings, callback) {
    const api = getChromeApi(chromeApi);
    const done = typeof callback === 'function' ? callback : () => {};
    const sourceTab = settings && settings.sourceTab && typeof settings.sourceTab === 'object'
      ? settings.sourceTab
      : null;
    const sourceGroup = getSourceSelectionGroup(api, sourceTab);
    if (sourceGroup) {
      done(sourceGroup);
      return;
    }
    const windowId = sourceTab && typeof sourceTab.windowId === 'number'
      ? sourceTab.windowId
      : (settings && typeof settings.windowId === 'number' ? settings.windowId : null);
    findExistingSelectionGroup(api, windowId, settings && settings.groupTitle, done);
  }

  function updateSelectionGroup(chromeApi, groupId, options, callback) {
    const api = getChromeApi(chromeApi);
    const done = typeof callback === 'function' ? callback : () => {};
    if (!api || !api.tabGroups || typeof api.tabGroups.update !== 'function') {
      done(false, 'tab-groups-update-unavailable');
      return;
    }
    const settings = options && typeof options === 'object' ? options : {};
    try {
      api.tabGroups.update(groupId, {
        title: settings.title || DEFAULT_GROUP_TITLE,
        color: settings.color || DEFAULT_GROUP_COLOR,
        collapsed: settings.collapsed !== false
      }, () => {
        const error = getRuntimeError(api, 'tab-group-update-failed');
        done(!error, error);
      });
    } catch (error) {
      done(false, error && error.message ? error.message : 'tab-group-update-threw');
    }
  }

  function addTabToSelectionGroup(chromeApi, tab, group, options, callback) {
    const api = getChromeApi(chromeApi);
    const done = typeof callback === 'function' ? callback : () => {};
    if (!api || !api.tabs || typeof api.tabs.group !== 'function' ||
        !tab || typeof tab.id !== 'number') {
      done({
        ok: true,
        mode: 'tab',
        tab: tab || null,
        groupId: null,
        reason: 'tab-groups-unavailable'
      });
      return;
    }
    const groupOptions = { tabIds: tab.id };
    if (group && typeof group.id === 'number') {
      groupOptions.groupId = group.id;
    }
    try {
      api.tabs.group(groupOptions, (groupId) => {
        const groupError = getRuntimeError(api, 'tab-group-failed');
        if (groupError || typeof groupId !== 'number') {
          done({
            ok: true,
            mode: 'tab',
            tab,
            groupId: null,
            reason: groupError || 'tab-group-unavailable'
          });
          return;
        }
        if (group && group.preserve === true) {
          done({
            ok: true,
            mode: 'group',
            tab,
            groupId,
            reason: ''
          });
          return;
        }
        updateSelectionGroup(api, groupId, options, (_updated, updateReason) => {
          done({
            ok: true,
            mode: 'group',
            tab,
            groupId,
            reason: updateReason || ''
          });
        });
      });
    } catch (error) {
      done({
        ok: true,
        mode: 'tab',
        tab,
        groupId: null,
        reason: error && error.message ? error.message : 'tab-group-threw'
      });
    }
  }

  function openInSelectionGroup(chromeApi, options, callback) {
    const api = getChromeApi(chromeApi);
    const settings = options && typeof options === 'object' ? options : {};
    const done = typeof callback === 'function' ? callback : () => {};
    const sourceTab = settings.sourceTab && typeof settings.sourceTab === 'object'
      ? settings.sourceTab
      : null;
    const windowId = sourceTab && typeof sourceTab.windowId === 'number'
      ? sourceTab.windowId
      : (typeof settings.windowId === 'number' ? settings.windowId : null);
    if (!api || !api.tabs || typeof api.tabs.create !== 'function') {
      done({ ok: false, mode: 'none', tab: null, reason: 'tabs-api-unavailable' });
      return;
    }
    const createProperties = {
      url: String(settings.url || ''),
      active: false
    };
    if (typeof windowId === 'number') {
      createProperties.windowId = windowId;
    }
    if (sourceTab && typeof sourceTab.id === 'number') {
      createProperties.openerTabId = sourceTab.id;
    }
    resolveSelectionGroup(api, settings, (group) => {
      try {
        api.tabs.create(createProperties, (tab) => {
          const createError = getRuntimeError(api, 'tab-create-failed');
          if (createError || !tab || typeof tab.id !== 'number') {
            done({
              ok: false,
              mode: 'none',
              tab: tab || null,
              reason: createError || 'tab-unavailable'
            });
            return;
          }
          addTabToSelectionGroup(api, tab, group, {
            title: settings.groupTitle || DEFAULT_GROUP_TITLE,
            color: settings.groupColor || DEFAULT_GROUP_COLOR,
            collapsed: true
          }, done);
        });
      } catch (error) {
        done({
          ok: false,
          mode: 'none',
          tab: null,
          reason: error && error.message ? error.message : 'tab-create-threw'
        });
      }
    });
  }

  function openInNewTab(chromeApi, options, callback) {
    const api = getChromeApi(chromeApi);
    const settings = options && typeof options === 'object' ? options : {};
    const done = typeof callback === 'function' ? callback : () => {};
    const sourceTab = settings.sourceTab && typeof settings.sourceTab === 'object'
      ? settings.sourceTab
      : null;
    if (!api || !api.tabs || typeof api.tabs.create !== 'function') {
      done({ ok: false, mode: 'none', tab: null, groupId: null, reason: 'tabs-api-unavailable' });
      return;
    }
    const createProperties = {
      url: String(settings.url || ''),
      active: true
    };
    const windowId = sourceTab && typeof sourceTab.windowId === 'number'
      ? sourceTab.windowId
      : (typeof settings.windowId === 'number' ? settings.windowId : null);
    if (typeof windowId === 'number') {
      createProperties.windowId = windowId;
    }
    if (sourceTab && typeof sourceTab.id === 'number') {
      createProperties.openerTabId = sourceTab.id;
    }
    try {
      api.tabs.create(createProperties, (tab) => {
        const createError = getRuntimeError(api, 'tab-create-failed');
        if (createError || !tab || typeof tab.id !== 'number') {
          done({
            ok: false,
            mode: 'none',
            tab: tab || null,
            groupId: null,
            reason: createError || 'tab-unavailable'
          });
          return;
        }
        done({ ok: true, mode: 'tab', tab, groupId: null, reason: '' });
      });
    } catch (error) {
      done({
        ok: false,
        mode: 'none',
        tab: null,
        groupId: null,
        reason: error && error.message ? error.message : 'tab-create-threw'
      });
    }
  }

  function openSelectionTarget(chromeApi, options, callback) {
    const settings = options && typeof options === 'object' ? options : {};
    const done = typeof callback === 'function' ? callback : () => {};
    tryOpenWithSplitViewAdapter(settings.splitViewAdapter, settings, (splitResult) => {
      if (splitResult) {
        done(splitResult);
        return;
      }
      if (settings.groupEnabled === true) {
        openInSelectionGroup(chromeApi, settings, done);
        return;
      }
      openInNewTab(chromeApi, settings, done);
    });
  }

  return Object.freeze({
    DEFAULT_GROUP_COLOR,
    DEFAULT_GROUP_TITLE,
    addTabToSelectionGroup,
    findExistingSelectionGroup,
    openInNewTab,
    openInSelectionGroup,
    openSelectionTarget,
    tryOpenWithSplitViewAdapter,
    updateSelectionGroup
  });
});
