const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const selectionIntent = require('../src/shared/selection-intent.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const dom = new JSDOM('<!doctype html><html lang="zh-CN"><body><p id="copy">serendipity</p><p><span id="generic-context"><em id="generic">React</em> trailing text</span></p><p id="cjk">这是你需要的资料</p><article id="x-post"><div><span id="x-body">这是一条来自 X 的帖子，包含跨节点正文</span> <a href="https://t.co/example">https://t.co/example</a></div></article></body></html>', {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'https://example.com/article'
  });
  const { window } = dom;
  window.LumnoSelectionIntent = selectionIntent;
  window.Range.prototype.getBoundingClientRect = () => ({
    bottom: 44,
    height: 18,
    left: 20,
    right: 110,
    top: 26,
    width: 90
  });
  window.Range.prototype.getClientRects = function() {
    const node = this.commonAncestorContainer;
    const element = node.nodeType === window.Node.ELEMENT_NODE ? node : node.parentElement;
    if (element && element.id === 'generic') {
      return [{ bottom: 88, height: 18, left: 20, right: 70, top: 70, width: 50 }];
    }
    if (element && element.id === 'generic-context') {
      return [{ bottom: 88, height: 18, left: 20, right: 210, top: 70, width: 190 }];
    }
    return [];
  };
  window.chrome = {
    i18n: {
      getMessage() { return ''; },
      getUILanguage() { return 'zh-CN'; }
    },
    runtime: {
      getURL(path) { return `chrome-extension://lumno/${path}`; },
      lastError: null,
      sendMessage(_message, callback) { callback({ ok: true }); }
    },
    storage: {
      local: {
        get(_keys, callback) { callback({}); }
      },
      onChanged: {
        addListener() {}
      },
      sync: {
        get(_keys, callback) {
          callback({
            _x_extension_selection_quick_actions_enabled_2026_unique_: true,
            _x_extension_selection_quick_actions_icon_set_2026_unique_: 'hugeicons'
          });
        }
      }
    }
  };

  const paragraph = window.document.getElementById('copy');
  const generic = window.document.getElementById('generic');
  const cjk = window.document.getElementById('cjk');
  const xPost = window.document.getElementById('x-post');
  window.eval(fs.readFileSync('src/shared/selection-action-icons.js', 'utf8'));
  window.eval(fs.readFileSync('src/content/selection-quick-actions.js', 'utf8'));

  paragraph.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 40
  }));
  const range = window.document.createRange();
  range.selectNodeContents(paragraph);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  paragraph.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 100,
    clientY: 40
  }));

  await wait(460);
  const host = window.document.getElementById('_x_extension_selection_quick_actions_host_2026_unique_');
  assert(host, 'high-confidence selection should create the quick action host');
  assert.strictEqual(host.hidden, false);
  assert.strictEqual(host.dataset.visible, 'true');
  assert.strictEqual(host.dataset.iconSet, 'hugeicons');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  assert.strictEqual(host.hidden, true, 'copy should dismiss the selection affordance');

  selection.removeAllRanges();
  generic.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 70
  }));
  const genericRange = window.document.createRange();
  genericRange.selectNodeContents(generic);
  selection.addRange(genericRange);
  generic.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 70,
    clientY: 70
  }));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a deliberate single-word selection should show the low-distraction entry');
  assert.strictEqual(host.style.left, '215px', 'the entry should sit after trailing text instead of covering it');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  selection.removeAllRanges();
  cjk.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 100
  }));
  const cjkRange = window.document.createRange();
  cjkRange.selectNodeContents(cjk);
  selection.addRange(cjkRange);
  cjk.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 110,
    clientY: 100
  }));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a deliberate Chinese short-sentence selection should show the entry');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  xPost.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 130
  }));
  xPost.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 120,
    clientY: 130
  }));
  const delayedXRange = window.document.createRange();
  delayedXRange.selectNodeContents(xPost);
  selection.addRange(delayedXRange);
  window.document.dispatchEvent(new window.Event('selectionchange'));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a selection that settles after pointerup should still trigger on X-like content');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  xPost.dispatchEvent(new window.Event('selectstart', { bubbles: true }));
  const selectStartXRange = window.document.createRange();
  selectStartXRange.selectNodeContents(xPost);
  selection.addRange(selectStartXRange);
  window.document.dispatchEvent(new window.Event('selectionchange'));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'selectstart should arm selection evaluation even when pointerup is absent');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  xPost.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 130
  }));
  const cancelledXRange = window.document.createRange();
  cancelledXRange.selectNodeContents(xPost);
  selection.addRange(cancelledXRange);
  xPost.dispatchEvent(new window.MouseEvent('pointercancel', {
    bubbles: true,
    button: 0,
    clientX: 120,
    clientY: 130
  }));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a pointercancel during X selection should not discard the selection trigger');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  const staleRange = window.document.createRange();
  staleRange.selectNodeContents(paragraph);
  selection.addRange(staleRange);
  paragraph.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 70,
    clientY: 40
  }));
  await wait(520);
  assert.strictEqual(host.hidden, true, 'an existing selection without a new pointer gesture should not trigger');

  dom.window.close();
  console.log('selection quick actions DOM tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
