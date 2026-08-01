const assert = require('assert');
const fs = require('fs');
const path = require('path');
const suggestionModel = require('../src/shared/suggestion-action-model.js');

const repoRoot = path.join(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function verifyClassification() {
  const runtime = suggestionModel;
  const directBefore = {
    type: 'directUrl',
    title: '打开 https://code.0h',
    url: 'https://code.0h'
  };
  const directAfter = {
    type: 'directUrl',
    title: '打开 https://code.0htt',
    url: 'https://code.0htt'
  };
  const history = {
    type: 'history',
    title: 'Code',
    url: 'https://code.example/'
  };
  const bookmark = {
    type: 'bookmark',
    title: 'Docs',
    url: 'https://docs.example/'
  };
  const baseState = {
    actionContextKey: '0|navigation|mixed',
    lastRenderedActionContextKey: '0|navigation|mixed'
  };

  assert.strictEqual(
    runtime.getSuggestionStructureIdentity(directBefore),
    runtime.getSuggestionStructureIdentity(directAfter),
    'a growing direct URL should keep one semantic row identity'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [directBefore, history],
      allSuggestions: [directAfter, history]
    }),
    'content',
    'a direct URL text change should be local content work'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [history],
      allSuggestions: [{ ...history }]
    }),
    'highlight',
    'identical ordered results should only update highlights'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [{
        ...history,
        score: 120,
        visitCount: 4,
        typedCount: 2,
        lastVisitTime: 100,
        reasons: ['标题前缀']
      }],
      allSuggestions: [{
        ...history,
        score: 260,
        visitCount: 9,
        typedCount: 5,
        lastVisitTime: 200,
        reasons: ['URL 前缀']
      }]
    }),
    'highlight',
    'ranking metadata must not invalidate a visible row'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [history],
      allSuggestions: [{ ...history, title: 'Code Home' }]
    }),
    'content',
    'visible row text changes still require content work'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [history],
      allSuggestions: [history, bookmark]
    }),
    'append',
    'a stable prefix plus new rows should be an append'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [history, bookmark],
      allSuggestions: [bookmark, history]
    }),
    'structure',
    'reordered semantic rows require a structure update'
  );
  assert.strictEqual(
    runtime.getSuggestionUpdateKind({
      ...baseState,
      currentSuggestions: [directBefore],
      allSuggestions: [{ ...directAfter, _xMatchedTabId: 42 }]
    }),
    'structure',
    'changing from open to switch-tab is a semantic change'
  );
}

verifyClassification();
const newtabSource = readSource('src/newtab/newtab.js');
const overlaySource = readSource('src/overlay/search-panel.js');

[newtabSource, overlaySource].forEach((source, index) => {
  assert.match(
    source,
    /SUGGESTION_ACTION_MODEL\.getSuggestionUpdateKind\(/,
    `${index === 0 ? 'New Tab' : 'Overlay'} should delegate update classification to the shared model`
  );
});

assert.match(
  newtabSource,
  /\(updateKind === 'append' \|\| updateKind === 'structure' \|\|\s*searchModeResultTransitionPending\)[\s\S]*?holdSuggestionsInputHeight\(\)/,
  'New Tab should lock height only for append, structure, or a pending mode transition'
);
assert.match(
  overlaySource,
  /updateKind === 'highlight' \|\| updateKind === 'content'[\s\S]*?\? null[\s\S]*?: captureSuggestionsHeightState\(suggestionsContainer\)/,
  'Overlay highlight and content updates should bypass height capture and animation'
);
assert.match(
  overlaySource,
  /reconcileSuggestionsHeightAfterRender\(previousHeightState, query, \{[\s\S]*?deferCappedShrink: shouldDeferCappedShrink/,
  'Overlay should run its height pipeline only for append or structure updates'
);
assert.match(
  newtabSource,
  /if \(isPaste \|\| getDirectUrlSuggestion\(query\)\) \{[\s\S]*?renderPendingSuggestions\(query\);[\s\S]*?requestSuggestions\(query, \{ immediate: true \}\);/,
  'New Tab should retain the previous result rows while a direct URL request is pending'
);
assert.match(
  overlaySource,
  /if \(isPaste \|\| getDirectUrlSuggestion\(query\)\) \{[\s\S]*?updatePendingSearchSuggestions\(query, \{[\s\S]*?deferCappedShrink: true[\s\S]*?\}\);/,
  'Overlay should retain the previous result rows while a direct URL request is pending'
);

console.log('suggestion render stability tests passed');
