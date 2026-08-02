const assert = require('assert');
const selectionTarget = require('../src/background/selection-target.js');

function createChromeStub(options) {
  const settings = options || {};
  const createdTabs = [];
  const groupedTabs = [];
  const updatedGroups = [];
  let nextTabId = 100;
  const chromeApi = {
    runtime: { lastError: null },
    tabGroups: {
      query(queryInfo, callback) {
        callback(settings.existingGroup ? [{ id: 33, ...queryInfo }] : []);
      },
      update(groupId, updateInfo, callback) {
        updatedGroups.push({ groupId, ...updateInfo });
        callback();
      }
    },
    tabs: {
      create(createProperties, callback) {
        createdTabs.push({ ...createProperties });
        callback({
          id: nextTabId++,
          windowId: createProperties.windowId || 1,
          url: createProperties.url,
          active: createProperties.active
        });
      },
      group(groupInfo, callback) {
        groupedTabs.push({ ...groupInfo });
        callback(typeof groupInfo.groupId === 'number' ? groupInfo.groupId : 44);
      }
    }
  };
  return { chromeApi, createdTabs, groupedTabs, updatedGroups };
}

{
  const { chromeApi, createdTabs, groupedTabs, updatedGroups } = createChromeStub({ existingGroup: true });
  let response = null;
  selectionTarget.openSelectionTarget(chromeApi, {
    url: 'https://chatgpt.com/',
    sourceTab: { id: 7, windowId: 9 }
  }, (result) => {
    response = result;
  });
  assert.deepStrictEqual(createdTabs[0], {
    url: 'https://chatgpt.com/',
    active: false,
    windowId: 9,
    openerTabId: 7
  });
  assert.deepStrictEqual(groupedTabs[0], { tabIds: 100, groupId: 33 });
  assert.deepStrictEqual(updatedGroups[0], {
    groupId: 33,
    title: 'Lumno AI',
    color: 'blue',
    collapsed: true
  });
  assert.strictEqual(response.mode, 'group');
  assert.strictEqual(response.groupId, 33);
}

{
  const { chromeApi, groupedTabs } = createChromeStub();
  let response = null;
  selectionTarget.openSelectionTarget(chromeApi, {
    url: 'https://gemini.google.com/app',
    sourceTab: { id: 8, windowId: 2 }
  }, (result) => {
    response = result;
  });
  assert.deepStrictEqual(groupedTabs[0], { tabIds: 100 });
  assert.strictEqual(response.mode, 'group');
  assert.strictEqual(response.groupId, 44);
}

{
  const { chromeApi, createdTabs } = createChromeStub();
  let response = null;
  selectionTarget.openSelectionTarget(chromeApi, {
    url: 'https://chatgpt.com/',
    sourceTab: { id: 1, windowId: 1 },
    splitViewAdapter: {
      openTarget(_options, callback) {
        callback({ ok: true, tab: { id: 88, windowId: 1 } });
      }
    }
  }, (result) => {
    response = result;
  });
  assert.strictEqual(createdTabs.length, 0, 'successful split view adapters should bypass group fallback');
  assert.strictEqual(response.mode, 'splitView');
  assert.strictEqual(response.tab.id, 88);
}

{
  const { chromeApi, createdTabs } = createChromeStub();
  let response = null;
  selectionTarget.openSelectionTarget(chromeApi, {
    url: 'https://chatgpt.com/',
    sourceTab: { id: 1, windowId: 1 },
    splitViewAdapter: {
      openTarget() {
        return { ok: true, tab: { id: 89, windowId: 1 } };
      }
    }
  }, (result) => {
    response = result;
  });
  assert.strictEqual(createdTabs.length, 0, 'synchronous split view adapters should bypass group fallback');
  assert.strictEqual(response.mode, 'splitView');
  assert.strictEqual(response.tab.id, 89);
}

console.log('background selection target tests passed');
