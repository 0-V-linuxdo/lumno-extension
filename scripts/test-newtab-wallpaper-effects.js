const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  globalThis: null
};
sandbox.globalThis = sandbox;

vm.runInNewContext(fs.readFileSync('src/newtab/wallpaper-effects.js', 'utf8'), sandbox, {
  filename: 'src/newtab/wallpaper-effects.js'
});

const effects = sandbox.LumnoNewtabWallpaperEffects;
assert.ok(effects, 'wallpaper effects module should initialize');
assert.strictEqual(typeof effects.analyzeImageData, 'function');
assert.strictEqual(typeof effects.getEffectCanvasScale, 'function');

const darkProfile = effects.analyzeImageData([
  10, 20, 30, 255,
  30, 40, 50, 255
]);
assert.ok(darkProfile.averageLuminance < 0.2, 'dark wallpaper samples should remain dark');
assert.ok(darkProfile.lowLuminance <= darkProfile.highLuminance);
assert.strictEqual(
  darkProfile.useDarkInk,
  false,
  'dark wallpapers should use luminous characters over the retained image'
);

const lightProfile = effects.analyzeImageData([
  238, 242, 248, 255,
  250, 246, 240, 255
]);
assert.ok(lightProfile.averageLuminance > 0.9, 'light wallpaper samples should remain light');
assert.ok(lightProfile.lowLuminance > 0.9, 'light wallpaper percentiles should retain their tonal range');
assert.strictEqual(
  lightProfile.useDarkInk,
  true,
  'light wallpapers should use dark characters over the retained image'
);

const transparentProfile = effects.analyzeImageData([
  0, 0, 0, 0
]);
assert.ok(
  transparentProfile.averageLuminance > 0.99,
  'transparent source pixels should be composited against white like the sampler'
);
assert.strictEqual(transparentProfile.useDarkInk, true);

const fallbackProfile = effects.analyzeImageData(null);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(fallbackProfile)),
  {
    averageLuminance: 0.5,
    lowLuminance: 0.1,
    highLuminance: 0.9,
    useDarkInk: false
  }
);

assert.ok(
  effects.getEffectCanvasScale(2, 1920, 1080) > 1.4,
  'common desktop viewports should receive supersampled effect layers'
);
assert.ok(
  effects.getEffectCanvasScale(2, 2560, 1440) > 1,
  'large desktop canvases should stay above CSS-pixel resolution while respecting the target budget'
);
assert.strictEqual(
  effects.getEffectCanvasScale(3, 390, 844),
  1.6,
  'small mobile canvases should use the configured supersampling ceiling'
);
assert.strictEqual(
  effects.getEffectCanvasScale(2, 5120, 2880),
  1,
  'very large viewports should never be upscaled from a sub-CSS-pixel backing buffer'
);

const normalized = effects.normalizePrefs({
  type: 'ascii',
  strength: 140,
  size: -4,
  spacing: 60,
  // Legacy stored values may still contain this removed preference.
  hover: false
});
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(normalized)),
  {
    version: 3,
    type: 'ascii',
    strength: 100,
    size: 0,
    spacing: 60
  }
);

const newtabHtml = fs.readFileSync('src/newtab/newtab.html', 'utf8');
assert.match(
  newtabHtml,
  /body\[data-wallpaper-active="true"\]\[data-wallpaper-effect="halftone"\]::after,\s*body\[data-wallpaper-active="true"\]\[data-wallpaper-effect="ascii"\]::after\s*\{[\s\S]*?opacity:\s*0;/,
  'halftone and ASCII should render as transparent layers above the existing wallpaper'
);
assert.doesNotMatch(
  newtabHtml,
  /body\[data-wallpaper-active="true"\]\[data-wallpaper-effect="(?:halftone|ascii)"\]\s*\{[^}]*--x-nt-wallpaper-image:\s*none;/,
  'layered effects should keep the CSS wallpaper visible instead of repainting it into the canvas'
);

const effectsSource = fs.readFileSync('src/newtab/wallpaper-effects.js', 'utf8');
const wallpaperSource = fs.readFileSync('src/newtab/wallpaper.js', 'utf8');
vm.runInNewContext(wallpaperSource, sandbox, {
  filename: 'src/newtab/wallpaper.js'
});
const wallpaper = sandbox.LumnoNewtabWallpaper;
assert.ok(wallpaper, 'wallpaper runtime module should initialize');
assert.strictEqual(
  wallpaper.WALLPAPER_EFFECT_MODE_STORAGE_VERSION,
  4,
  'mode-aware wallpaper effect storage should have an explicit schema version'
);
const legacyEffectPrefs = {
  version: 3,
  type: 'grain',
  strength: 64,
  size: 35,
  spacing: 72
};
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(wallpaper.normalizeWallpaperEffectStoragePrefs(legacyEffectPrefs))),
  {
    version: 4,
    light: legacyEffectPrefs,
    dark: legacyEffectPrefs
  },
  'legacy shared wallpaper effects should migrate to identical light and dark preferences'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(wallpaper.normalizeWallpaperEffectStoragePrefs({
    version: 4,
    light: { type: 'halftone', strength: 31, size: 42, spacing: 53 },
    dark: { type: 'ascii', strength: 82, size: 73, spacing: 64 }
  }))),
  {
    version: 4,
    light: { version: 3, type: 'halftone', strength: 31, size: 42, spacing: 53 },
    dark: { version: 3, type: 'ascii', strength: 82, size: 73, spacing: 64 }
  },
  'mode-aware wallpaper effects should preserve independent light and dark values'
);
assert.match(
  effectsSource,
  /function drawCachedLayeredEffect\([\s\S]*?effectBaseCacheKey !== cacheKey[\s\S]*?drawLayer\(context,[\s\S]*?effectBaseCacheKey = cacheKey;/,
  'layered wallpaper filters should cache their high-resolution static canvas'
);
assert.doesNotMatch(
  newtabHtml,
  /x-nt-wallpaper-effect-hover-canvas/,
  'new tab styles should not retain the removed wallpaper hover canvas'
);
assert.doesNotMatch(
  effectsSource,
  /pointermove|pointerleave|hoverPointer|hoverContext|prefs\.hover/,
  'wallpaper filters should not bind pointer-driven hover rendering'
);
assert.doesNotMatch(
  wallpaperSource,
  /newtab_wallpaper_effect_hover|wallpaperEffectHover|createEffectToggleControl/,
  'wallpaper settings should not render or localize a hover-effect control'
);
assert.match(
  wallpaperSource,
  /currentWallpaperPrefs && currentWallpaperPrefs\.sameForModes === false[\s\S]*?\\? \[editMode\][\s\S]*?: NEWTAB_WALLPAPER_MODES/,
  'split wallpapers should save effects only to the mode currently being edited'
);
assert.match(
  wallpaperSource,
  /function handleThemeModeChange\([\s\S]*?applyWallpaperEffectForResolvedMode\(\)/,
  'theme changes should apply the effect stored for the resolved wallpaper mode'
);
assert.match(
  effectsSource,
  /visualPrefsChanged && previousType === prefs\.type[\s\S]*?scheduleRender\(PARAMETER_RENDER_DEBOUNCE_MS\)/,
  'continuous parameter input should debounce expensive full-layer renders'
);

process.stdout.write('new tab wallpaper effects tests passed\n');
