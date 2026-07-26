const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const newtabHtml = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const shortcutDialogJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/shortcut-dialog.js'), 'utf8');
const shortcutDialogCss = fs.readFileSync(path.join(repoRoot, 'src/newtab/shortcut-dialog.css'), 'utf8');
const wallpaperAdaptiveToneJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/wallpaper-adaptive-tone.js'), 'utf8');
const tooltipJs = fs.readFileSync(path.join(repoRoot, 'src/shared/tooltip.js'), 'utf8');
const optionsHtml = fs.readFileSync(path.join(repoRoot, 'src/options/options.html'), 'utf8');
const locales = ['zh_CN', 'zh_TW', 'en', 'ja'].map((locale) => ({
  locale,
  messages: JSON.parse(fs.readFileSync(path.join(repoRoot, `_locales/${locale}/messages.json`), 'utf8'))
}));

function assertContains(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function assertNotContains(source, needle, message) {
  assert.ok(!source.includes(needle), message);
}

function assertMessage(locale, messages, key) {
  assert.ok(
    messages[key] && typeof messages[key].message === 'string' && messages[key].message.trim(),
    `${locale} should localize ${key}`
  );
}

function getCssRuleBlock(source, selector) {
  const selectorIndex = source.indexOf(`${selector} {`);
  assert.ok(selectorIndex >= 0, `${selector} rule should exist`);
  const blockStart = source.indexOf('{', selectorIndex);
  const blockEnd = source.indexOf('\n      }', blockStart);
  assert.ok(blockStart >= 0 && blockEnd > blockStart, `${selector} rule should be readable`);
  return source.slice(blockStart + 1, blockEnd);
}

function getCssDeclaration(block, property) {
  const match = block.match(new RegExp(`^\\s*${property}: ([^;]+);`, 'm'));
  assert.ok(match, `${property} declaration should exist`);
  return `${property}: ${match[1]};`;
}

function getFunctionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} function should exist`);
  const bodyStart = source.indexOf('{', start);
  assert.ok(bodyStart >= 0, `${name} function body should start`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${name} function body should end`);
  return '';
}

function createFakeStyle() {
  const values = new Map();
  return {
    setProperty(name, value) {
      values.set(String(name), String(value));
    },
    getPropertyValue(name) {
      return values.get(String(name)) || '';
    },
    removeProperty(name) {
      values.delete(String(name));
    }
  };
}

function createToneElement(rect) {
  const attributes = new Map();
  return {
    style: createFakeStyle(),
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
    },
    getAttribute(name) {
      return attributes.has(String(name)) ? attributes.get(String(name)) : null;
    },
    removeAttribute(name) {
      attributes.delete(String(name));
    },
    getBoundingClientRect() {
      return rect || {
        left: 100,
        top: 100,
        right: 148,
        bottom: 148,
        width: 48,
        height: 48
      };
    }
  };
}

function parseSolidRgb(value) {
  const match = String(value || '').match(/^rgb\((\d+) (\d+) (\d+)\)$/);
  assert.ok(match, `Expected a solid rgb() color, got ${value}`);
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3])
  };
}

function getTestColorLuminance(color) {
  return ((color.red * 0.299) + (color.green * 0.587) + (color.blue * 0.114)) / 255;
}

function getTestRelativeLuminance(color) {
  function linearize(channel) {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  }
  return (0.2126 * linearize(color.red)) +
    (0.7152 * linearize(color.green)) +
    (0.0722 * linearize(color.blue));
}

function getTestContrastRatio(firstColor, secondColor) {
  const firstLuminance = getTestRelativeLuminance(firstColor);
  const secondLuminance = getTestRelativeLuminance(secondColor);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

async function assertDarkWallpaperShortcutAdaptiveTone() {
  const wordmark = createToneElement({
    left: 390,
    top: 54,
    right: 610,
    bottom: 126,
    width: 220,
    height: 72
  });
  const shortcutTile = createToneElement();
  const addTile = createToneElement();
  const disabledTarget = createToneElement();
  shortcutTile.setAttribute('data-shortcut-theme-default', 'true');
  disabledTarget.setAttribute('data-wallpaper-ink', 'light');
  disabledTarget.setAttribute('data-wallpaper-icon-bg', 'true');
  disabledTarget.style.setProperty('--x-nt-wallpaper-icon-solid-bg', 'rgb(20 28 45)');
  const pixel = { red: 17, green: 85, blue: 101 };
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        drawImage() {},
        getImageData() {
          const length = Math.max(1, canvas.width * canvas.height) * 4;
          const data = new Uint8ClampedArray(length);
          for (let index = 0; index < length; index += 4) {
            data[index] = pixel.red;
            data[index + 1] = pixel.green;
            data[index + 2] = pixel.blue;
            data[index + 3] = 255;
          }
          return { data };
        }
      };
    }
  };
  const body = createToneElement();
  body.setAttribute('data-wallpaper-active', 'true');
  const documentObj = {
    body,
    documentElement: {
      clientWidth: 1000,
      clientHeight: 600
    },
    createElement(tagName) {
      return String(tagName).toLowerCase() === 'canvas'
        ? canvas
        : createToneElement();
    }
  };
  const windowObj = {
    innerWidth: 1000,
    innerHeight: 600,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {}
  };
  class FakeImage {
    constructor() {
      this.width = 10;
      this.height = 10;
      this.naturalWidth = 10;
      this.naturalHeight = 10;
      this.onload = null;
      this.onerror = null;
    }
    set src(value) {
      this._src = value;
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }
    get src() {
      return this._src;
    }
    decode() {
      return Promise.resolve();
    }
  }
  const sandbox = {
    console,
    Image: FakeImage,
    Uint8ClampedArray,
    setTimeout,
    clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(wallpaperAdaptiveToneJs, sandbox);
  const runtime = sandbox.LumnoNewtabWallpaperAdaptiveTone.createWallpaperAdaptiveTone({
    documentObj,
    windowObj,
    getTargets() {
      return [
        {
          element: wordmark,
          sampleElement: wordmark,
          minWidth: 220,
          minHeight: 72
        },
        {
          element: shortcutTile,
          sampleElement: shortcutTile,
          minWidth: 42,
          minHeight: 42,
          iconButton: true,
          forcedIconBackground: 'default-theme'
        },
        {
          element: addTile,
          sampleElement: addTile,
          minWidth: 42,
          minHeight: 42,
          iconButton: true,
          forcedIconBackground: 'shortcut-add'
        },
        {
          element: disabledTarget,
          sampleElement: disabledTarget,
          minWidth: 42,
          minHeight: 42,
          iconButton: true,
          disabled: true
        }
      ];
    },
    getCurrentWallpaper() {
      return { id: 'dark-test-wallpaper' };
    },
    getWallpaperImageUrl() {
      return 'test://dark-wallpaper';
    },
    getOverlayAlphaAtViewportY() {
      return 0;
    },
    getOverlayLuminance() {
      return 0;
    },
    getEffectLuminanceAtViewport() {
      return null;
    },
    applyWordmarkThemeAppearance() {}
  });

  runtime.refresh();
  await new Promise((resolve) => setTimeout(resolve, 5));

  const wordmarkColor = parseSolidRgb(
    wordmark.style.getPropertyValue('--x-nt-wallpaper-wordmark-ink')
  );
  const shortcutBackground = parseSolidRgb(
    shortcutTile.style.getPropertyValue('--x-nt-shortcut-wallpaper-icon-bg')
  );
  const shortcutForeground = parseSolidRgb(
    shortcutTile.style.getPropertyValue('--x-nt-shortcut-wallpaper-icon-color')
  );
  const addBackground = parseSolidRgb(addTile.style.getPropertyValue('--x-nt-shortcut-add-bg'));
  const addForeground = parseSolidRgb(addTile.style.getPropertyValue('--x-nt-shortcut-add-color'));
  assert.strictEqual(disabledTarget.getAttribute('data-wallpaper-ink'), null);
  assert.strictEqual(disabledTarget.getAttribute('data-wallpaper-icon-bg'), null);
  assert.strictEqual(
    disabledTarget.style.getPropertyValue('--x-nt-wallpaper-icon-solid-bg'),
    ''
  );

  assert.ok(
    getTestContrastRatio(wordmarkColor, pixel) >= 3.25,
    'wallpaper wordmark should keep accessible contrast on a similarly colored dark background'
  );
  assert.ok(
    getTestColorLuminance(shortcutBackground) < 0.36,
    'dark wallpaper URL fallback shortcut backgrounds should stay in the dark-mode surface range'
  );
  assert.ok(
    getTestColorLuminance(addBackground) < 0.42,
    'dark wallpaper add shortcut background should stay dark instead of becoming white'
  );
  assert.ok(
    getTestColorLuminance(shortcutForeground) > 0.72,
    'dark wallpaper URL fallback shortcut icon should remain light on the dark surface'
  );
  assert.ok(
    getTestColorLuminance(addForeground) > 0.72,
    'dark wallpaper add shortcut icon should remain light on the dark surface'
  );
}

async function assertDarkThemeLightWallpaperShortcutAdaptiveTone() {
  const wordmark = createToneElement({
    left: 390,
    top: 54,
    right: 610,
    bottom: 126,
    width: 220,
    height: 72
  });
  const shortcutTile = createToneElement();
  const addTile = createToneElement();
  shortcutTile.setAttribute('data-shortcut-theme-default', 'true');
  const pixel = { red: 238, green: 242, blue: 247 };
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        drawImage() {},
        getImageData() {
          const length = Math.max(1, canvas.width * canvas.height) * 4;
          const data = new Uint8ClampedArray(length);
          for (let index = 0; index < length; index += 4) {
            data[index] = pixel.red;
            data[index + 1] = pixel.green;
            data[index + 2] = pixel.blue;
            data[index + 3] = 255;
          }
          return { data };
        }
      };
    }
  };
  const body = createToneElement();
  body.setAttribute('data-wallpaper-active', 'true');
  body.setAttribute('data-theme', 'dark');
  const documentObj = {
    body,
    documentElement: {
      clientWidth: 1000,
      clientHeight: 600
    },
    createElement(tagName) {
      return String(tagName).toLowerCase() === 'canvas'
        ? canvas
        : createToneElement();
    }
  };
  const windowObj = {
    innerWidth: 1000,
    innerHeight: 600,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {}
  };
  class FakeImage {
    constructor() {
      this.width = 10;
      this.height = 10;
      this.naturalWidth = 10;
      this.naturalHeight = 10;
      this.onload = null;
      this.onerror = null;
    }
    set src(value) {
      this._src = value;
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }
    get src() {
      return this._src;
    }
    decode() {
      return Promise.resolve();
    }
  }
  const sandbox = {
    console,
    Image: FakeImage,
    Uint8ClampedArray,
    setTimeout,
    clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(wallpaperAdaptiveToneJs, sandbox);
  const runtime = sandbox.LumnoNewtabWallpaperAdaptiveTone.createWallpaperAdaptiveTone({
    documentObj,
    windowObj,
    getTargets() {
      return [
        {
          element: wordmark,
          sampleElement: wordmark,
          minWidth: 220,
          minHeight: 72
        },
        {
          element: shortcutTile,
          sampleElement: shortcutTile,
          minWidth: 42,
          minHeight: 42,
          iconButton: true,
          forcedIconBackground: 'default-theme'
        },
        {
          element: addTile,
          sampleElement: addTile,
          minWidth: 42,
          minHeight: 42,
          iconButton: true,
          forcedIconBackground: 'shortcut-add'
        }
      ];
    },
    getCurrentWallpaper() {
      return { id: 'light-wallpaper-dark-theme' };
    },
    getWallpaperImageUrl() {
      return 'test://light-wallpaper-dark-theme';
    },
    getOverlayAlphaAtViewportY() {
      return 0;
    },
    getOverlayLuminance() {
      return 1;
    },
    getEffectLuminanceAtViewport() {
      return null;
    },
    applyWordmarkThemeAppearance() {}
  });

  runtime.refresh();
  await new Promise((resolve) => setTimeout(resolve, 5));

  const wordmarkColor = parseSolidRgb(
    wordmark.style.getPropertyValue('--x-nt-wallpaper-wordmark-ink')
  );
  const shortcutBackground = parseSolidRgb(
    shortcutTile.style.getPropertyValue('--x-nt-shortcut-wallpaper-icon-bg')
  );
  const shortcutForeground = parseSolidRgb(
    shortcutTile.style.getPropertyValue('--x-nt-shortcut-wallpaper-icon-color')
  );
  const addBackground = parseSolidRgb(addTile.style.getPropertyValue('--x-nt-shortcut-add-bg'));
  const addForeground = parseSolidRgb(addTile.style.getPropertyValue('--x-nt-shortcut-add-color'));

  assert.ok(
    getTestContrastRatio(wordmarkColor, pixel) >= 3.25,
    'wallpaper wordmark should keep accessible contrast on a similarly colored light background'
  );
  assert.ok(
    getTestColorLuminance(shortcutBackground) < 0.36,
    'dark theme URL fallback shortcut backgrounds should stay dark even on a light wallpaper'
  );
  assert.ok(
    getTestColorLuminance(addBackground) < 0.42,
    'dark theme add shortcut background should stay dark even on a light wallpaper'
  );
  assert.ok(
    getTestColorLuminance(shortcutForeground) > 0.72,
    'dark theme URL fallback shortcut icon should remain light on the dark surface'
  );
  assert.ok(
    getTestColorLuminance(addForeground) > 0.72,
    'dark theme add shortcut icon should remain light on the dark surface'
  );
}

assertContains(
  newtabHtml,
  '<script src="shortcuts-store.js"></script>',
  'new tab page should load the shortcuts store before newtab.js'
);

assert.ok(
  newtabHtml.indexOf('<script src="shortcuts-store.js"></script>') <
    newtabHtml.indexOf('src="../shared/react-page-bootstrap.js"'),
  'shortcuts store should load before the page bootstrap'
);

assertContains(
  newtabHtml,
  '<script src="shortcut-icon-store.js"></script>',
  'new tab page should load the local shortcut icon store'
);

assert.ok(
  newtabHtml.indexOf('<script src="shortcut-icon-store.js"></script>') <
    newtabHtml.indexOf('<script src="shortcut-dialog.js"></script>'),
  'shortcut icon processing should load before the dialog component'
);

[
  '.x-nt-shortcuts-section',
  '.x-nt-shortcut-tile',
  '.x-nt-shortcut-tile--add',
  '.x-nt-shortcut-favicon-mask',
  '.x-nt-shortcut-context-menu'
].forEach((selector) => {
  assertContains(newtabHtml, selector, `${selector} should be styled`);
});

[
  '.x-nt-shortcut-dialog',
  '.x-nt-shortcut-dialog-backdrop',
  '.x-lumno-action-button',
  '.x-lumno-action-button--primary',
  '.x-lumno-action-button--secondary'
].forEach((selector) => {
  assertContains(shortcutDialogCss, selector, `${selector} should be owned by the dialog component stylesheet`);
});

assertContains(
  shortcutDialogCss,
  'background: var(--x-nt-shortcut-dialog-bg, rgb(255 255 255 / 0.98));',
  'shortcut dialog should use a more solid floating panel surface color'
);

const wallpaperPanelRule = getCssRuleBlock(newtabHtml, '.x-nt-wallpaper-panel');
const shortcutDialogRule = getCssRuleBlock(shortcutDialogCss, '.x-nt-shortcut-dialog');
const settingsPanelRule = getCssRuleBlock(optionsHtml, '#_x_extension_settings_panel_2024_unique_');
[
  'border-radius',
  'box-shadow'
].forEach((property) => {
  assert.strictEqual(
    getCssDeclaration(shortcutDialogRule, property),
    getCssDeclaration(wallpaperPanelRule, property),
    `shortcut dialog ${property} should match the bottom-right floating panel`
  );
});

assert.strictEqual(
  getCssDeclaration(shortcutDialogRule, 'border'),
  'border: 0;',
  'shortcut dialog should preserve the current borderless floating surface'
);

[
  '--input-focus-color',
  '--input-focus-shadow',
  '--input-placeholder',
  '--input-focus-bg',
  '--control-bg',
  '--tab-border'
].forEach((property) => {
  assert.strictEqual(
    getCssDeclaration(shortcutDialogRule, property),
    getCssDeclaration(settingsPanelRule, property),
    `shortcut dialog ${property} should match options input tokens`
  );
});

assertContains(
  shortcutDialogCss,
  'transform: translate3d(var(--x-nt-shortcut-dialog-enter-x, 0px), var(--x-nt-shortcut-dialog-enter-y, 12px), 0) scale(0.98);',
  'shortcut dialog should open from a trigger-aware direction'
);

assertContains(
  shortcutDialogCss,
  '._x_extension_shortcut_input_2024_unique_',
  'shortcut dialog inputs should reuse the settings text input component class'
);

const optionsAffixRule = getCssRuleBlock(optionsHtml, '._x_extension_shortcut_input_affix_2026_unique_');
const newtabAffixRule = getCssRuleBlock(shortcutDialogCss, '.x-nt-shortcut-dialog ._x_extension_shortcut_input_affix_2026_unique_');
[
  'display',
  'align-items',
  'gap',
  'border-radius',
  'border',
  'background',
  'transition',
  'overflow'
].forEach((property) => {
  assert.strictEqual(
    getCssDeclaration(newtabAffixRule, property),
    getCssDeclaration(optionsAffixRule, property),
    `shortcut dialog input affix ${property} should match options`
  );
});

const optionsAffixInputRule = getCssRuleBlock(
  optionsHtml,
  '._x_extension_shortcut_input_affix_2026_unique_ ._x_extension_shortcut_input_2024_unique_'
);
const newtabAffixInputRule = getCssRuleBlock(
  shortcutDialogCss,
  '.x-nt-shortcut-dialog ._x_extension_shortcut_input_affix_2026_unique_ ._x_extension_shortcut_input_2024_unique_'
);
[
  'border',
  'background',
  'border-radius',
  'padding-left',
  'flex',
  'min-width'
].forEach((property) => {
  assert.strictEqual(
    getCssDeclaration(newtabAffixInputRule, property),
    getCssDeclaration(optionsAffixInputRule, property),
    `shortcut dialog nested input ${property} should match options`
  );
});

assertContains(
  shortcutDialogCss,
  '.x-nt-shortcut-dialog-backdrop[data-open="true"] .x-nt-shortcut-dialog',
  'shortcut dialog should animate into its open state'
);

assertContains(
  shortcutDialogCss,
  '.x-nt-shortcut-dialog-backdrop[data-preparing="true"] .x-nt-shortcut-dialog',
  'shortcut dialog should disable transitions while its trigger-aware start position is prepared'
);

assertContains(
  shortcutDialogCss,
  '@media (prefers-reduced-motion: reduce)',
  'shortcut dialog motion should respect reduced-motion preferences'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcuts-reserved-height: 82px;',
  'shortcut rail should define a compact stable reserved height before stored shortcuts load'
);

assertContains(
  newtabHtml,
  'min-height: var(--x-nt-shortcuts-reserved-height, 82px);',
  'shortcut rail should reserve its final row height to avoid moving the search box'
);

assertContains(
  newtabHtml,
  'body:not([data-nt-ready="1"]) .x-nt-shortcuts-section',
  'shortcut rail should stay hidden until stored shortcuts are rendered'
);

assertContains(
  optionsHtml,
  '_x_extension_newtab_shortcuts_toggle_2026_unique_',
  'appearance settings should include a New Tab shortcuts visibility toggle'
);

assertContains(
  optionsHtml,
  'data-i18n="settings_newtab_shortcuts_title"',
  'appearance settings should label the New Tab shortcuts visibility toggle'
);

assertContains(
  newtabJs,
  "const NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY = '_x_extension_newtab_shortcuts_visible_2026_unique_';",
  'newtab runtime should read a dedicated shortcuts visibility setting'
);

assertContains(
  newtabJs,
  'function applyNewtabShortcutsVisibility()',
  'newtab runtime should centralize shortcut section visibility updates'
);

assertContains(
  newtabJs,
  "setContentSectionVisible(shortcutSection, Boolean(newtabShortcutsVisible));",
  'newtab runtime should hide the shortcut rail when the shortcuts setting is off'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-tile-size: 64px;',
  'shortcut tiles should define a compact dock-sized hit target'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-icon-size: 48px;',
  'shortcut icons should start smaller before dock magnification'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-favicon-size: 28px;',
  'shortcut favicons should scale down with the compact icon size'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-dock-duration: 300ms;',
  'shortcut dock hover should use a slower follow-through duration'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-dock-ease: cubic-bezier(0.22, 1, 0.36, 1);',
  'shortcut dock hover should use a smooth ease-out curve'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-icon-radius: 16px;',
  'shortcut icons should define a smooth rounded-rectangle radius'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-favicon-radius: max(',
  'shortcut favicon mask radius should be derived from the outer icon inset'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-smooth-mask-outer: url("data:image/svg+xml,',
  'shortcut icons should define an SVG smooth-corner mask'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-smooth-mask-inner: url("data:image/svg+xml,',
  'shortcut favicon masks should define their own nested smooth-corner mask'
);

const shortcutIconRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcut-icon');
assertContains(
  shortcutIconRule,
  'border-radius: var(--x-nt-shortcut-icon-radius, 16px);',
  'shortcut icons should use the smooth rounded-rectangle radius'
);

assertContains(
  shortcutIconRule,
  'width: var(--x-nt-shortcut-icon-size, 48px);',
  'shortcut icons should use the compact dock base size'
);

assertContains(
  shortcutIconRule,
  'transform: translate3d(',
  'shortcut icons should animate through transform for dock magnification'
);

assertContains(
  shortcutIconRule,
  'transition:',
  'shortcut icons should transition dock magnification'
);

assertContains(
  shortcutIconRule,
  'will-change: auto;',
  'shortcut icons should avoid permanent compositor promotion while idle'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-dock-distance] .x-nt-shortcut-icon',
  'shortcut icons should enable transform pre-promotion only while dock hover is active'
);

assertContains(
  shortcutIconRule,
  'background: var(--x-nt-shortcut-wallpaper-icon-bg, var(--x-nt-shortcut-icon-bg, rgba(241, 245, 249, 0.9)));',
  'shortcut icons should prefer a wallpaper-adaptive background before falling back to the per-site theme background'
);

assertContains(
  shortcutIconRule,
  'border: 0;',
  'shortcut icons should not render a border stroke'
);

assertContains(
  shortcutIconRule,
  'box-shadow: none;',
  'shortcut icons should not render a drop shadow'
);

assertContains(
  shortcutIconRule,
  '-webkit-mask-image: var(--x-nt-shortcut-smooth-mask-outer);',
  'shortcut icons should use the continuous-corner mask in Chromium'
);

assertContains(
  shortcutIconRule,
  'mask-image: var(--x-nt-shortcut-smooth-mask-outer);',
  'shortcut icons should use the continuous-corner mask as the standard path'
);

assertNotContains(
  shortcutIconRule,
  'border-radius: 50%;',
  'shortcut icons should no longer render as circles'
);

const shortcutAddIconRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcut-icon--add');
assertContains(
  shortcutAddIconRule,
  'background: var(--x-nt-shortcut-add-bg, rgba(248, 250, 252, 0.92));',
  'add shortcut icon should use a softer version of the URL fallback background'
);

const darkShortcutAddIconRule = getCssRuleBlock(newtabHtml, 'body[data-theme="dark"] .x-nt-shortcut-icon--add');
assertContains(
  darkShortcutAddIconRule,
  'background: var(--x-nt-shortcut-add-bg, rgba(255, 255, 255, 0.13));',
  'dark add shortcut icon should stay slightly lighter than the URL fallback background'
);

const shortcutGridRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcuts-grid');
assertContains(
  shortcutGridRule,
  'display: flex;',
  'shortcut rail should use a dock-like flex row'
);

assertContains(
  shortcutGridRule,
  'align-items: flex-end;',
  'shortcut rail should align magnified icons from the bottom like a dock'
);

assertContains(
  shortcutGridRule,
  'gap: var(--x-nt-shortcuts-grid-row-gap, 10px) var(--x-nt-shortcuts-grid-column-gap, 4px);',
  'shortcut rail should keep icons slightly closer together through adaptive tokens'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcuts-grid-row-gap: 10px;',
  'shortcut rail should define its default row gap token'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcuts-grid-column-gap: 4px;',
  'shortcut rail should define its default column gap token'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-dock-distance="0"] .x-nt-shortcut-icon',
  'shortcut dock should define a hovered icon scale'
);

const shortcutNearHoverRule = getCssRuleBlock(
  newtabHtml,
  '.x-nt-shortcut-tile[data-dock-distance="0"] .x-nt-shortcut-icon'
);
assertContains(
  shortcutNearHoverRule,
  '--x-nt-shortcut-dock-scale: var(--x-nt-shortcut-hover-scale-near, 1.28);',
  'shortcut dock should magnify the hovered icon without overshooting'
);

assertContains(
  shortcutNearHoverRule,
  '--x-nt-shortcut-dock-rise: var(--x-nt-shortcut-hover-rise-near, -6px);',
  'shortcut dock should keep vertical lift restrained'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-hover-scale-near: 1.28;',
  'shortcut dock should define the default hovered icon scale token'
);

assertContains(
  newtabHtml,
  '--x-nt-shortcut-hover-rise-near: -6px;',
  'shortcut dock should define the default hovered icon lift token'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-dock-side="before"][data-dock-distance="1"] .x-nt-shortcut-icon',
  'shortcut dock should move previous neighbors away from the hover target'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-dock-side="after"][data-dock-distance="1"] .x-nt-shortcut-icon',
  'shortcut dock should move next neighbors away from the hover target'
);

assertContains(
  newtabHtml,
  '@media (prefers-reduced-motion: reduce)',
  'shortcut dock motion should respect reduced-motion preferences'
);

const shortcutFaviconMaskRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcut-favicon-mask');
assertContains(
  shortcutFaviconMaskRule,
  'width: var(--x-nt-shortcut-favicon-size, 28px);',
  'shortcut favicon mask should use the compact dock favicon size'
);

assertContains(
  shortcutFaviconMaskRule,
  'border-radius: var(--x-nt-shortcut-favicon-radius, 8px);',
  'shortcut favicon mask should use the nested rounded-rectangle radius'
);

assertContains(
  shortcutFaviconMaskRule,
  'overflow: hidden;',
  'shortcut favicon mask should clip favicon corners'
);

assertNotContains(
  shortcutFaviconMaskRule,
  'background:',
  'shortcut favicon mask should only clip the favicon and not add a background surface'
);

assertContains(
  shortcutFaviconMaskRule,
  '-webkit-mask-image: var(--x-nt-shortcut-smooth-mask-inner);',
  'shortcut favicon mask should use the nested continuous-corner mask in Chromium'
);

assertContains(
  shortcutFaviconMaskRule,
  'mask-image: var(--x-nt-shortcut-smooth-mask-inner);',
  'shortcut favicon mask should use the nested continuous-corner mask as the standard path'
);

const shortcutFaviconRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcut-favicon');
assertContains(
  shortcutFaviconRule,
  'border-radius: inherit;',
  'shortcut favicon image should inherit the inner mask corner radius'
);

assertContains(
  shortcutFaviconRule,
  '-webkit-user-drag: none;',
  'shortcut favicon images should not start a native image drag'
);

assertContains(
  newtabJs,
  'const NEWTAB_SHORTCUTS_STORE = globalThis.LumnoNewtabShortcutsStore || {};',
  'newtab runtime should read the shortcuts store'
);

assertContains(
  newtabJs,
  "typeof NEWTAB_SHORTCUTS_STORE.loadShortcuts !== 'function'",
  'newtab runtime should guard for the shortcuts store API'
);

assertContains(
  newtabJs,
  "typeof NEWTAB_SHORTCUTS_STORE.saveShortcuts !== 'function'",
  'newtab runtime should guard for bulk shortcut saving before drag reorder is enabled'
);

assertContains(
  newtabJs,
  "const NEWTAB_SHORTCUTS_STORAGE_KEY = '_x_extension_newtab_shortcuts_2026_unique_';",
  'newtab runtime should define a dedicated storage key for shortcuts'
);

assertContains(
  newtabJs,
  'NEWTAB_SHORTCUTS_STORAGE_KEY',
  'newtab runtime should include shortcuts in storage handling'
);

assertContains(
  newtabJs,
  "shortcutSection.id = '_x_extension_newtab_shortcuts_2026_unique_';",
  'newtab runtime should create a shortcuts section under the search box'
);

assertContains(
  newtabJs,
  "addShortcutButton.className = 'x-nt-shortcut-tile x-nt-shortcut-tile--add';",
  'newtab runtime should render a Chrome-like add shortcut tile'
);

assertContains(
  newtabJs,
  'function setShortcutDockHover(activeTile, pointerX) {',
  'newtab runtime should calculate shortcut dock hover states'
);

assertContains(
  newtabJs,
  "tile.setAttribute('data-tooltip', title);",
  'shortcut tiles should expose full titles through the anchored tooltip attribute'
);

assertContains(
  newtabJs,
  "tile.setAttribute('data-shortcut-id', shortcut.id || shortcut.url || '');",
  'shortcut tiles should expose stable ids for drag reordering'
);

assertContains(
  newtabJs,
  "tile.setAttribute('data-shortcut-draggable', 'true');",
  'shortcut tiles should opt into pointer drag reordering'
);

assertContains(
  newtabJs,
  "tile.addEventListener('dragstart', handleShortcutNativeDragStart);",
  'shortcut tiles should block native child image drags while preserving pointer reordering'
);

assertContains(
  newtabJs,
  'function handleShortcutNativeDragStart(event) {',
  'shortcut drag reordering should prevent browser-native drag previews'
);

assertContains(
  newtabJs,
  'img.draggable = false;',
  'shortcut favicon images should not be individually draggable'
);

assertContains(
  getFunctionSource(newtabJs, 'renderShortcutTile'),
  "tile.setAttribute('data-shortcut-custom-icon', 'true');",
  'shortcut tiles should mark and render a locally uploaded icon before favicon fallbacks'
);

assertContains(
  getFunctionSource(newtabJs, 'renderShortcutTile'),
  'customIconDataUrl: localIconDataUrl',
  'shortcut tiles should pass uploaded image data into their theme suggestion'
);

assertContains(
  getFunctionSource(newtabJs, 'getThemeForSuggestion'),
  'loadThemeFromImageSource(',
  'custom shortcut images should resolve a theme directly from their image data'
);

assertContains(
  getFunctionSource(newtabJs, 'getThemeForSuggestion'),
  "customShortcutIcon,\n        '',\n        false",
  'custom shortcut image themes should not overwrite the website host theme cache'
);

assertContains(
  getFunctionSource(newtabJs, 'isShortcutThemeDefaultForWallpaper'),
  'theme._xIsCustomShortcutIcon',
  'neutral custom-image themes should remain authoritative over wallpaper adaptive colors'
);

assertContains(
  newtabJs,
  "tile.setAttribute('data-dock-distance', String(distance));",
  'shortcut dock should mark each visible neighbor by distance from the hovered tile'
);

assertContains(
  newtabJs,
  "tile.setAttribute('data-dock-side', offset < 0 ? 'before' : offset > 0 ? 'after' : 'active');",
  'shortcut dock should mark which side of the hovered tile each neighbor occupies'
);

assertContains(
  newtabJs,
  'function applyShortcutDockPointerStyles(tile, pointerX, offset) {',
  'shortcut dock should continuously update icon transforms from the pointer position'
);

assertContains(
  newtabJs,
  'const sideMultiplier = numericOffset < 0 ? -1 : numericOffset > 0 ? 1 : 0;',
  'shortcut dock should keep the active icon horizontally anchored while neighbors move aside'
);

assertContains(
  newtabJs,
  'const landingTaper = Math.max(0, 1 - eased);',
  'shortcut dock neighbor shift should taper out as the pointer lands on that icon'
);

assertContains(
  newtabJs,
  'const shiftPx = sideMultiplier * 16 * eased * landingTaper * distanceFalloff;',
  'shortcut dock horizontal movement should stay continuous when switching active icons'
);

assertContains(
  newtabJs,
  "icon.style.setProperty('--x-nt-shortcut-dock-scale', (1 + (0.28 * eased)).toFixed(3));",
  'shortcut dock pointer tracking should write a continuous scale value'
);

assertContains(
  newtabJs,
  "icon.style.setProperty('--x-nt-shortcut-dock-rise', `${Math.round(-6 * eased)}px`);",
  'shortcut dock pointer tracking should keep vertical lift restrained'
);

assertContains(
  newtabJs,
  'function handleShortcutDragPointerDown(event) {',
  'shortcut grid should track pointer drag gestures for reordering'
);

assertContains(
  newtabJs,
  'Math.hypot(dx, dy) < SHORTCUT_DRAG_START_THRESHOLD_PX',
  'shortcut drag reordering should wait for a movement threshold so clicks still open shortcuts'
);

assertContains(
  newtabJs,
  'function getShortcutDragInsertionIndex(pointerX, pointerY) {',
  'shortcut drag reordering should use a logical insertion slot instead of animated hit areas'
);

assertContains(
  newtabJs,
  'getShortcutTileLayoutRect(tile)',
  'shortcut drag reordering should measure untransformed tile slots while neighbors animate'
);

assertContains(
  newtabJs,
  'function moveShortcutItem(shortcutId, targetIndex) {',
  'shortcut drag reordering should move the in-memory shortcut into the insertion slot'
);

assertContains(
  newtabJs,
  'function moveShortcutTileElement(tile, targetIndex) {',
  'shortcut drag reordering should move DOM tiles without rerendering mid-gesture'
);

assertContains(
  newtabJs,
  'function setShortcutDragTileTransform(state, pointerX, pointerY) {',
  'dragged shortcut tiles should follow the pointer while reordering'
);

assertContains(
  newtabJs,
  "state.tile.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;",
  'dragged shortcut tiles should use direct transform updates for cursor tracking'
);

assertContains(
  newtabJs,
  'function animateShortcutLayoutShift(beforeRects, draggedTile) {',
  'shortcut drag reordering should animate neighboring tiles into their new slots'
);

assertContains(
  newtabJs,
  'const beforeRects = getShortcutTileRectMap();',
  'shortcut drag reordering should measure old tile positions before moving'
);

assertContains(
  newtabJs,
  'animateShortcutLayoutShift(beforeRects, shortcutDragState.tile);',
  'shortcut drag reordering should use FLIP animation after each insertion move'
);

assertContains(
  newtabJs,
  'function settleShortcutDragTile(tile) {',
  'dragged shortcut tiles should smoothly settle into their final slot on release'
);

assertContains(
  newtabJs,
  "tile.style.pointerEvents = 'none';",
  'dragged shortcut tiles should not block hit testing for the destination slot'
);

assertContains(
  newtabJs,
  'NEWTAB_SHORTCUTS_STORE.saveShortcuts(storageArea, newtabShortcuts, options)',
  'shortcut drag reordering should persist the reordered shortcut array'
);

assertContains(
  newtabJs,
  'tile._xShortcutSuppressClick = true;',
  'shortcut drag reordering should prevent the release click from opening the dragged shortcut'
);

assertContains(
  newtabJs,
  'applyShortcutDockPointerStyles(tile, pointerX, offset);',
  'shortcut dock pointer tracking should pass each tile position so the active icon does not jump sideways'
);

assertContains(
  newtabJs,
  'function applyShortcutTileTheme(tile, theme, host) {',
  'shortcut tiles should apply favicon theme colors to the icon surface'
);

assertContains(
  newtabJs,
  "tile.style.setProperty('--x-nt-shortcut-icon-bg', colors.iconBg);",
  'shortcut tile theme should set the outer icon background color'
);

assertContains(
  newtabJs,
  "tile.setAttribute('data-shortcut-theme-default', isDefaultTheme ? 'true' : 'false');",
  'shortcut tiles should mark whether their URL background needs a forced wallpaper contrast color'
);

const applyThemeModeSource = getFunctionSource(newtabJs, 'applyThemeMode');
assertContains(
  newtabJs,
  'function refreshShortcutTileThemes() {',
  'shortcut theme refresh should live in a named helper instead of patching applyThemeMode inline'
);

assertContains(
  getFunctionSource(newtabJs, 'refreshShortcutTileThemes'),
  'shortcutTiles.forEach((tile) => {',
  'shortcut theme refresh helper should revisit existing shortcut tiles'
);

assertContains(
  getFunctionSource(newtabJs, 'refreshShortcutTileThemes'),
  "applyShortcutTileTheme(tile, tile._xTheme, tile._xHost || '');",
  'shortcut theme refresh helper should recompute icon colors from cached theme and host'
);

assertContains(
  applyThemeModeSource,
  'refreshShortcutTileThemes();',
  'theme changes should refresh shortcut colors through the named helper'
);

assertContains(
  newtabJs,
  "if (source === 'favicon') {",
  'shortcut fallback detection should handle async favicon themes separately'
);

assertContains(
  newtabJs,
  "return theme._xThemeNeutral === true ||",
  'neutral favicon themes should still receive the wallpaper-adaptive URL fallback background'
);

assertContains(
  newtabJs,
  "forcedIconBackground: 'default-theme'",
  'shortcut wallpaper tone targets should only force backgrounds for default-theme URL tiles'
);

assertContains(
  newtabJs,
  "forcedIconBackground: 'shortcut-add'",
  'add shortcut tile should receive a softer wallpaper-adaptive background'
);

assertContains(
  wallpaperAdaptiveToneJs,
  "setStyleProperty(element, '--x-nt-shortcut-add-bg'",
  'wallpaper adaptive tone should write the add shortcut background variable'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'function getForcedShortcutSurfaceInk(ink, themeMode) {',
  'forced shortcut backgrounds should resolve theme-aware surface ink through a named helper'
);

assertContains(
  wallpaperAdaptiveToneJs,
  "return themeMode === 'dark' ? 'light' : ink;",
  'dark theme shortcut backgrounds should stay in the dark surface branch even on light wallpapers'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'const urlSurfaceColor = getShortcutUrlSurfaceColor(color, luminance, forcedSurfaceInk);',
  'forced shortcut backgrounds should resolve URL fallback surface through the theme-aware ink'
);

assertContains(
  wallpaperAdaptiveToneJs,
  "documentObj.body.getAttribute('data-theme') === 'dark'",
  'wallpaper adaptive shortcut backgrounds should read the current resolved theme'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'function getShortcutAddSurfaceColor(urlSurfaceColor, ink) {',
  'add shortcut backgrounds should be named as a surface derived from the URL fallback'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'function getShortcutUrlBaseSurfaceColor(color, localLuminance, ink) {',
  'wallpaper adaptive tone should isolate the URL-specific ink-aware base surface algorithm'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'function getShortcutUrlSurfaceColor(color, localLuminance, ink) {',
  'URL fallback backgrounds should expose a final surface helper instead of add-button wording'
);

assertContains(
  wallpaperAdaptiveToneJs,
  "if (ink === 'light') {",
  'wallpaper adaptive shortcut backgrounds should switch to dark-mode surfaces when light icon ink is required'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'const paleBase = surfaceLuminance >= 0.58',
  'URL fallback backgrounds should start from a pale white-gray base'
);

assertContains(
  wallpaperAdaptiveToneJs,
  'const tintAmount = mixNumber(0.055, 0.2, hueStrength);',
  'URL fallback backgrounds should only carry a restrained amount of local hue'
);

assertContains(
  newtabJs,
  'const baseTarget = isDark ? [22, 22, 22] : [255, 255, 255];',
  'shortcut icon backgrounds should tint toward the same base target as recent cards'
);

assertContains(
  newtabJs,
  'const iconBgRgb = mixColor(accentRgb, baseTarget, isDark ? 0.72 : 0.82);',
  'shortcut icon backgrounds should use the recent-card tint ratio instead of raw accent color'
);

assertContains(
  newtabJs,
  'iconBg: rgbToCss(iconBgRgb),',
  'shortcut icon theme should expose the softened tint as the outer background'
);

assertNotContains(
  newtabJs,
  "--x-nt-shortcut-favicon-mask-bg",
  'shortcut tile theme should not set an inner favicon mask background'
);

assertContains(
  getFunctionSource(newtabJs, 'renderShortcutTile'),
  "url: shortcut.url,\n      title,\n      customIconDataUrl: localIconDataUrl",
  'shortcut tiles should resolve themes from their destination URL or uploaded icon'
);

assertContains(
  newtabJs,
  'queueThemeForTarget(tile, themeSuggestion, (theme) => {',
  'shortcut tiles should refresh when async favicon or meta theme resolution completes'
);

assertContains(
  newtabJs,
  "faviconMask.className = 'x-nt-shortcut-favicon-mask';",
  'shortcut favicons should be wrapped in the rounded-rectangle mask'
);

assertContains(
  newtabJs,
  'bindShortcutTooltip(tile, () => tile.getAttribute(\'data-shortcut-title\') || title,',
  'shortcut title anchored tooltips should be bound even without visible labels'
);

assertContains(
  newtabJs,
  "id: '_x_extension_newtab_shortcut_tooltip_2026_unique_',",
  'shortcut title tooltips should use a dedicated anchored tooltip controller'
);

assertContains(
  newtabJs,
  "className: 'x-nt-shortcut-tooltip',",
  'shortcut title tooltips should be styleable independently from other tooltips'
);

assertContains(
  newtabJs,
  "placement: 'bottom',",
  'shortcut title tooltips should open below the icon'
);

assertContains(
  newtabJs,
  'spacing: -6',
  'shortcut title tooltips should sit close to the icon'
);

assertContains(
  newtabJs,
  'showOnFocus: false',
  'shortcut title tooltips should not remain visible after the pointer leaves a focused shortcut'
);

assertContains(
  newtabJs,
  'function isShortcutTooltipSuppressed() {',
  'shortcut title tooltips should expose a suppression guard for drag gestures'
);

assertContains(
  newtabJs,
  'if (isShortcutTooltipSuppressed()) {\n        return \'\';\n      }',
  'shortcut title tooltips should not open while a shortcut is being dragged'
);

assertNotContains(
  newtabJs,
  "shortcutGrid.addEventListener('focusin', handleShortcutDockFocusIn);",
  'shortcut dock magnification should not stick from keyboard or restored focus'
);

assertNotContains(
  newtabJs,
  "shortcutGrid.addEventListener('focusout', handleShortcutDockFocusOut);",
  'shortcut dock hover reset should be driven by pointer leave rather than focus retention'
);

assertNotContains(
  newtabJs,
  "bindCursorTooltip(tile, () => tile.getAttribute('data-shortcut-title') || title,",
  'shortcut tiles should no longer use cursor-following title tooltips'
);

assertNotContains(
  newtabJs,
  'label.title = title;',
  'shortcut labels should avoid native title bubbles when cursor tooltips are bound'
);

assertNotContains(
  newtabJs,
  "label.className = 'x-nt-shortcut-label';",
  'shortcut tiles should no longer render visible title labels'
);

assertNotContains(
  newtabJs,
  'function isShortcutTitleTruncated',
  'shortcut tooltip visibility should not depend on a removed visible label'
);

assertContains(
  newtabJs,
  "addShortcutButton.setAttribute('data-tooltip', addLabel);",
  'add shortcut tile should expose its label through the anchored tooltip'
);

assertContains(
  newtabJs,
  'bindShortcutTooltip(addShortcutButton, () =>',
  'add shortcut tile should bind the anchored shortcut tooltip'
);

assertContains(
  tooltipJs,
  "config.placement === 'bottom'",
  'shared tooltip positioning should accept bottom placement'
);

assertContains(
  tooltipJs,
  "placement === 'bottom'",
  'shared tooltip positioning should branch for bottom placement'
);

assertContains(
  tooltipJs,
  'top = targetBottom + spacing;',
  'bottom tooltip placement should start below the target'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointerover', handleShortcutDockPointerOver);",
  'shortcut grid should update dock state on pointer hover'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointermove', handleShortcutDockPointerMove);",
  'shortcut grid should keep dock magnification following the pointer'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointerleave', resetShortcutDockHover);",
  'shortcut grid should reset dock state when the pointer leaves'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointerdown', handleShortcutDragPointerDown);",
  'shortcut grid should start drag tracking from pointer down'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointermove', handleShortcutDragPointerMove);",
  'shortcut grid should update drag reordering on pointer move'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointerup', handleShortcutDragPointerUp);",
  'shortcut grid should finish drag reordering on pointer up'
);

assertContains(
  newtabJs,
  "shortcutGrid.addEventListener('pointercancel', handleShortcutDragPointerCancel);",
  'shortcut grid should clean up drag reordering when the pointer is canceled'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-shortcut-draggable="true"]',
  'shortcut draggable tiles should expose a drag affordance'
);

const shortcutContextMenuRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcut-context-menu');
assertContains(
  shortcutContextMenuRule,
  'position: fixed;',
  'shortcut context menu anchor should use a fixed point near the right-click location'
);

assertContains(
  shortcutContextMenuRule,
  'width: 1px;',
  'shortcut context menu anchor should not add visible layout around shortcuts'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-context-menu ._x_extension_select_trigger_2024_unique_',
  'shortcut context menu should reuse the shared custom select trigger element'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-context-menu-portal',
  'shortcut context menu should style the shared custom select portal menu'
);

const shortcutContextMenuPortalRule = getCssRuleBlock(newtabHtml, '.x-nt-shortcut-context-menu-portal');
assertContains(
  shortcutContextMenuPortalRule,
  '--x-nt-shortcut-context-menu-radius: 12px;',
  'shortcut context menu should name its outer corner radius'
);

assertContains(
  shortcutContextMenuPortalRule,
  '--x-nt-shortcut-context-menu-padding: 6px;',
  'shortcut context menu should name its inner padding'
);

assertContains(
  shortcutContextMenuPortalRule,
  'border-radius: var(--x-nt-shortcut-context-menu-radius, 12px);',
  'shortcut context menu outer radius should be driven by the named radius token'
);

assertContains(
  shortcutContextMenuPortalRule,
  'padding: var(--x-nt-shortcut-context-menu-padding, 6px);',
  'shortcut context menu padding should be driven by the named padding token'
);

assertNotContains(
  newtabHtml,
  '.x-nt-shortcut-context-menu-portal ._x_extension_select_option_2024_unique_',
  'shortcut context menu options should inherit the shared custom select option radius'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-shortcut-context-menu-open="true"] .x-nt-shortcut-icon',
  'shortcut context menu should keep the selected shortcut in a persistent hover state'
);

const shortcutContextMenuOpenIconRule = getCssRuleBlock(
  newtabHtml,
  '.x-nt-shortcut-tile[data-shortcut-context-menu-open="true"] .x-nt-shortcut-icon'
);
assertContains(
  shortcutContextMenuOpenIconRule,
  'filter: brightness(',
  'shortcut context menu selected shortcut should darken slightly while the menu is open'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-shortcut-dragging="true"] .x-nt-shortcut-icon',
  'shortcut dragging should provide immediate visual feedback'
);

assertContains(
  newtabHtml,
  '.x-nt-shortcut-tile[data-shortcut-dropping="true"] .x-nt-shortcut-icon',
  'shortcut drop settling should keep the dragged tile visually above the row'
);

assertContains(
  newtabJs,
  'const shortcutContextMenuSelectController = globalThis.LumnoCustomSelect &&',
  'shortcut context menu should reuse the shared custom select controller'
);

assertContains(
  newtabJs,
  'function createShortcutContextMenu() {',
  'shortcut runtime should create a shared context menu instead of per-tile menu DOM'
);

assertContains(
  newtabJs,
  'shortcutContextMenuSelectController.createSelect({',
  'shortcut context menu should be built with the shared custom select component'
);

assertContains(
  newtabJs,
  "menuClassName: 'x-nt-shortcut-context-menu-portal',",
  'shortcut context menu should render through a styleable custom select portal'
);

assertContains(
  newtabJs,
  "menuAlign: 'middle',",
  'shortcut context menu should center align like the shortcut tooltip instead of left-aligning at the pointer'
);

assertContains(
  newtabJs,
  'const SHORTCUT_CONTEXT_MENU_PORTAL_OFFSET_PX = -6;',
  'shortcut context menu should use the same vertical spacing as the shortcut tooltip'
);

assertContains(
  newtabJs,
  'trigger.tabIndex = -1;',
  'shortcut context menu hidden trigger should not add an invisible tab stop'
);

assertContains(
  newtabJs,
  "label: t('shortcuts_edit', 'Edit')",
  'shortcut context menu should include an Edit action'
);

assertContains(
  newtabJs,
  "label: t('shortcuts_remove', 'Remove')",
  'shortcut context menu should include a Remove action'
);

assertContains(
  newtabJs,
  'function openShortcutContextMenu(tile) {',
  'shortcut runtime should open the context menu at the right-clicked shortcut'
);

assertContains(
  newtabJs,
  'function getShortcutContextMenuAnchorElement(tile) {',
  'shortcut context menu should position from the shortcut icon anchor'
);

assertContains(
  newtabJs,
  'const anchor = getShortcutContextMenuAnchorElement(tile);',
  'shortcut context menu should calculate its anchor from the icon instead of the pointer'
);

assertContains(
  newtabJs,
  'shortcutContextMenu.select.value = SHORTCUT_CONTEXT_MENU_EDIT_VALUE;',
  'shortcut context menu should keep the Edit option selected so the menu highlight stays black'
);

assertContains(
  newtabJs,
  'function handleShortcutContextMenuActionClick(event) {',
  'shortcut context menu should handle option clicks directly so re-clicking selected Edit still works'
);

assertContains(
  newtabJs,
  'shortcutContextMenuSelectController.setOpen(shortcutContextMenu.control, true);',
  'shortcut context menu should open through the custom select controller API'
);

assertContains(
  newtabJs,
  'function handleShortcutContextMenu(event) {',
  'shortcut tiles should handle native contextmenu events'
);

assertContains(
  getFunctionSource(newtabJs, 'handleShortcutContextMenu'),
  'event.preventDefault();\n    event.stopPropagation();',
  'shortcut context menu should suppress the browser menu and keep the event away from drag handling'
);

assertContains(
  getFunctionSource(newtabJs, 'handleShortcutContextMenu'),
  'openShortcutContextMenu(tile);',
  'shortcut context menu should open from the shortcut icon anchor instead of the right-click pointer coordinates'
);

assertNotContains(
  getFunctionSource(newtabJs, 'handleShortcutContextMenu'),
  'event.clientX, event.clientY',
  'shortcut context menu should not follow the right-click pointer coordinates'
);

assertContains(
  newtabJs,
  "tile.addEventListener('contextmenu', handleShortcutContextMenu);",
  'each rendered shortcut tile should bind the right-click context menu'
);

assertContains(
  newtabJs,
  'function isShortcutContextMenuNode(node) {',
  'shortcut runtime should recognize custom select menu nodes before drag handling'
);

assertContains(
  getFunctionSource(newtabJs, 'handleShortcutDragPointerDown'),
  'isShortcutContextMenuNode(event.target)',
  'shortcut drag pointerdown should ignore the context menu control and portal'
);

assertContains(
  getFunctionSource(newtabJs, 'handleShortcutDragPointerDown'),
  'closeShortcutContextMenu();',
  'shortcut drag pointerdown should close any open context menu before starting a drag gesture'
);

assertContains(
  newtabJs,
  'function setShortcutContextMenuTileActive(shortcutId) {',
  'shortcut context menu should mark the target shortcut while the menu is open'
);

assertContains(
  newtabJs,
  'function clearShortcutContextMenuTileActive() {',
  'shortcut context menu should clear the persistent hover marker when it closes'
);

assertContains(
  newtabJs,
  'function syncShortcutDockHoverFromPoint(clientX, clientY) {',
  'shortcut context menu close should restore normal dock hover behavior from the pointer location'
);

assertContains(
  newtabJs,
  "document.addEventListener('pointerdown', handleShortcutContextMenuDocumentPointerDown, true);",
  'blank clicks should close the shortcut context menu through the same cleanup path'
);

assertContains(
  newtabJs,
  'function openShortcutEditor(shortcut, sourceElement) {',
  'shortcut context menu edit action should open the existing shortcut dialog in edit mode'
);

assertContains(
  newtabJs,
  'function saveEditedShortcutFromDialog(title, url, shortcutId, iconState) {',
  'shortcut dialog should have a dedicated edit save path'
);

assertContains(
  getFunctionSource(newtabJs, 'saveShortcutFromDialog'),
  'return saveEditedShortcutFromDialog(title, url, dialogState.shortcutId, iconState);',
  'shortcut dialog submit should branch cleanly between add and edit modes'
);

assertContains(
  newtabJs,
  'function removeShortcutById(shortcutId) {',
  'shortcut context menu remove action should persistently remove the target shortcut'
);

assertContains(
  newtabJs,
  'function persistShortcuts(nextShortcuts, toastMessage, iconChange) {',
  'shortcut edit/remove should share one normalized persistence helper'
);

assertContains(
  newtabJs,
  'NEWTAB_SHORTCUT_DIALOG.createShortcutDialog({',
  'newtab runtime should instantiate the shortcut dialog component'
);

assertContains(
  shortcutDialogJs,
  'function setEnterDirection(sourceElement)',
  'shortcut dialog component should calculate its enter direction from the trigger position'
);

assertContains(
  shortcutDialogJs,
  "dialog.style.setProperty('--x-nt-shortcut-dialog-enter-x'",
  'shortcut dialog should write a trigger-aware x enter offset'
);

assertContains(
  shortcutDialogJs,
  "dialog.style.setProperty('--x-nt-shortcut-dialog-enter-y'",
  'shortcut dialog should write a trigger-aware y enter offset'
);

assertContains(
  shortcutDialogJs,
  "backdrop.setAttribute('data-open', 'false');\n      backdrop.hidden = false;",
  'shortcut dialog should start closed before animating open'
);

assertContains(
  shortcutDialogJs,
  "backdrop.setAttribute('data-preparing', 'true');",
  'shortcut dialog should prepare its start position before transitions are enabled'
);

assertContains(
  shortcutDialogJs,
  'setEnterDirection(openOpts.sourceElement);',
  'shortcut dialog should set its enter direction before animating open'
);

assertContains(
  shortcutDialogJs,
  "backdrop.removeAttribute('data-preparing');",
  'shortcut dialog should re-enable transitions before opening'
);

assertContains(
  shortcutDialogJs,
  "backdrop.setAttribute('data-open', 'true');",
  'shortcut dialog should move into its animated open state'
);

assertContains(
  shortcutDialogJs,
  'function handleSubmit(event)',
  'shortcut dialog component should own form submission behavior'
);

assertContains(
  newtabJs,
  'shortcutIconStore.writeAll(nextIcons)',
  'newtab runtime should persist custom icons in the local-only icon store'
);

assertContains(
  newtabJs,
  'return Promise.all([loadShortcuts(), loadShortcutIcons()]).then(() => {',
  'newtab runtime should load shortcut metadata and local icons together'
);

assert.ok(
  newtabJs.indexOf('const shortcutsReadyPromise = loadNewtabShortcutsVisibility().then(loadVisibleShortcuts);') <
    newtabJs.indexOf('markNewtabReady();'),
  'newtab runtime should not mark the page ready before shortcut loading starts'
);

assert.match(
  newtabJs,
  /return shortcutsReadyPromise;[\s\S]*markNewtabReady\(\);/,
  'newtab ready transition should wait for stored shortcuts to render'
);

assertContains(
  shortcutDialogJs,
  "cancelButton.className = 'x-lumno-action-button x-lumno-action-button--secondary x-nt-shortcut-dialog-button x-nt-shortcut-dialog-button--secondary';",
  'shortcut cancel button should use the Lumno secondary button component'
);

assertContains(
  shortcutDialogJs,
  "doneButton.className = 'x-lumno-action-button x-lumno-action-button--primary x-nt-shortcut-dialog-button x-nt-shortcut-dialog-button--primary';",
  'shortcut done button should use the Lumno primary button component'
);

assertContains(
  shortcutDialogJs,
  "nameInput.className = '_x_extension_shortcut_input_2024_unique_';",
  'shortcut name input should reuse the settings text input component'
);

assertContains(
  shortcutDialogJs,
  "nameInputShell.className = '_x_extension_shortcut_input_affix_2026_unique_';",
  'shortcut name input should use the options input affix wrapper'
);

assertContains(
  shortcutDialogJs,
  "nameInputShell.setAttribute('data-has-prefix', 'false');",
  'shortcut name input affix should use the no-prefix options mode'
);

assertContains(
  shortcutDialogJs,
  "urlInput.className = '_x_extension_shortcut_input_2024_unique_';",
  'shortcut url input should reuse the settings text input component'
);

assertContains(
  shortcutDialogJs,
  "urlInputShell.className = '_x_extension_shortcut_input_affix_2026_unique_';",
  'shortcut url input should use the options input affix wrapper'
);

assertContains(
  shortcutDialogJs,
  "urlInputShell.setAttribute('data-has-prefix', 'false');",
  'shortcut url input affix should use the no-prefix options mode'
);

const themeBootstrapIndex = newtabJs.indexOf('bootstrapInitialThemeMode();');
assert.ok(themeBootstrapIndex > -1, 'newtab runtime should bootstrap the initial theme');
[
  'const suggestionItems = [];',
  'let selectedIndex = -1;',
  'let suggestionsView = null;',
  'let inputParts = null;'
].forEach((marker) => {
  const markerIndex = newtabJs.indexOf(marker);
  assert.ok(
    markerIndex > -1 && markerIndex < themeBootstrapIndex,
    `${marker} should be initialized before theme bootstrap reads suggestion state`
  );
});

assertContains(
  newtabJs,
  'if (!suggestionsView) {\n      return;\n    }\n    suggestionsView.updateSelection(selectedIndex);',
  'theme bootstrap should not call the suggestions view before it exists'
);

[
  'newtab_shortcuts_add',
  'newtab_shortcuts_dialog_title',
  'newtab_shortcuts_name_label',
  'newtab_shortcuts_url_label',
  'newtab_shortcuts_icon_label',
  'newtab_shortcuts_icon_info_label',
  'newtab_shortcuts_icon_info',
  'newtab_shortcuts_icon_choose',
  'newtab_shortcuts_icon_replace',
  'newtab_shortcuts_icon_remove',
  'newtab_shortcuts_icon_unsupported',
  'newtab_shortcuts_icon_dimensions_too_large',
  'newtab_shortcuts_icon_invalid',
  'newtab_shortcuts_icon_storage_error',
  'newtab_shortcuts_cancel',
  'newtab_shortcuts_done',
  'newtab_shortcuts_save',
  'newtab_shortcuts_invalid_url',
  'newtab_shortcuts_added',
  'newtab_shortcuts_edited',
  'newtab_shortcuts_removed',
  'newtab_shortcuts_edit_dialog_title',
  'newtab_shortcuts_context_menu_label',
  'settings_newtab_shortcuts_title',
  'shortcuts_edit',
  'shortcuts_remove'
].forEach((key) => {
  locales.forEach(({ locale, messages }) => assertMessage(locale, messages, key));
});

Promise.all([
  assertDarkWallpaperShortcutAdaptiveTone(),
  assertDarkThemeLightWallpaperShortcutAdaptiveTone()
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
