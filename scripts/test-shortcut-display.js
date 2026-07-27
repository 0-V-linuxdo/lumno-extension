const assert = require('assert');
const fs = require('fs');
const path = require('path');

const shortcutDisplay = require('../src/shared/shortcut-display.js');
const shortcutReference = require('../src/shared/shortcut-reference.js');

const macNavigator = {
  platform: 'Linux x86_64',
  userAgentData: { platform: 'macOS' },
  userAgent: 'Mozilla/5.0'
};
const windowsNavigator = {
  platform: 'Win32',
  userAgentData: { platform: 'Windows' },
  userAgent: 'Mozilla/5.0'
};

assert.strictEqual(
  shortcutDisplay.getNavigatorPlatform(macNavigator),
  'mac',
  'User-Agent Client Hints should identify macOS even when navigator.platform is reduced'
);
assert.strictEqual(
  shortcutDisplay.getNavigatorPlatform(windowsNavigator),
  'windows',
  'Windows should keep the text modifier convention'
);

assert.strictEqual(
  shortcutDisplay.formatShortcutReference('Alt+ArrowUp / Alt+ArrowDown', {
    navigatorLike: macNavigator
  }),
  '⌥↑ / ⌥↓',
  'macOS input history shortcuts should use Option and arrow symbols'
);
assert.strictEqual(
  shortcutDisplay.formatShortcutReference('Alt+ArrowUp / Alt+ArrowDown', {
    navigatorLike: windowsNavigator
  }),
  'Alt+↑ / Alt+↓',
  'Windows input history shortcuts should keep Alt and use arrow symbols'
);
assert.strictEqual(
  shortcutDisplay.formatShortcutReference('Enter / release Alt', {
    navigatorLike: macNavigator
  }),
  '↩ / ⌥↑',
  'macOS release instructions should not leak the Alt label'
);
assert.strictEqual(
  shortcutDisplay.formatShortcutReference('Enter / release Alt', {
    navigatorLike: windowsNavigator
  }),
  'Enter / Alt↑',
  'Windows release instructions should retain the Alt label'
);
assert.strictEqual(
  shortcutDisplay.formatShortcutChord('Alt+Q', { navigatorLike: macNavigator }),
  '⌥Q',
  'macOS Alt shortcuts should render with the Option symbol'
);
assert.strictEqual(
  shortcutDisplay.formatShortcutChord('Alt+Q', { navigatorLike: windowsNavigator }),
  'Alt+Q',
  'Windows Alt shortcuts should remain textual'
);
assert.strictEqual(
  shortcutDisplay.formatShortcutTemplate('Press {shortcut}', 'Alt+Q', {
    navigatorLike: macNavigator
  }),
  'Press ⌥Q',
  'shortcut placeholders should render with the current platform convention'
);

const shortcutDefinitions = shortcutReference
  .getBrowserShortcutDefinitions()
  .concat(shortcutReference.getFixedShortcutDefinitions());
shortcutDefinitions.forEach((definition) => {
  const macSource = definition.shortcut ||
    (definition.defaultShortcut && definition.defaultShortcut.mac) ||
    '';
  const windowsSource = definition.shortcut ||
    (definition.defaultShortcut && definition.defaultShortcut.default) ||
    '';
  const macLabel = shortcutDisplay.formatShortcutReference(macSource, {
    platform: 'mac'
  });
  const windowsLabel = shortcutDisplay.formatShortcutReference(windowsSource, {
    platform: 'windows'
  });
  assert.doesNotMatch(
    macLabel,
    /\bAlt\b|Arrow(?:Up|Down|Left|Right)/,
    `${definition.id} should not expose Alt or raw Arrow key names on macOS`
  );
  assert.doesNotMatch(
    windowsLabel,
    /Arrow(?:Up|Down|Left|Right)/,
    `${definition.id} should not expose raw Arrow key names on Windows`
  );
});

const optionsSource = fs.readFileSync(
  path.join(__dirname, '..', 'src/options/options.js'),
  'utf8'
);
assert.match(
  optionsSource,
  /const keyMapDefault = \{[\s\S]*ArrowUp: '↑',[\s\S]*ArrowDown: '↓',[\s\S]*ArrowLeft: '←',[\s\S]*ArrowRight: '→'/,
  'editable shortcuts should use arrow symbols on non-Mac platforms too'
);
assert.match(
  optionsSource,
  /const effectiveShortcut = shortcut \|\| defaultShortcut;\s*setFallbackShortcutLabel\(effectiveShortcut\);/,
  'the stored shortcut should remain parseable and only be formatted at render time'
);
assert.match(
  optionsSource,
  /shortcutsStatus\.textContent = currentShortcutLabel[\s\S]*formatShortcutForDisplay\(currentShortcutLabel\)/,
  'the shortcut status chip should format the raw shortcut for the current platform'
);

console.log('shortcut display tests passed');
