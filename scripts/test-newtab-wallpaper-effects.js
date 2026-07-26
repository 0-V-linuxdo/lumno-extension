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
  hover: false
});
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(normalized)),
  {
    version: 3,
    type: 'ascii',
    strength: 100,
    size: 0,
    spacing: 60,
    hover: false
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
assert.match(
  effectsSource,
  /function drawCachedLayeredEffect\([\s\S]*?effectBaseCacheKey !== cacheKey[\s\S]*?drawLayer\(context,[\s\S]*?false\);[\s\S]*?hoverContext\.clearRect[\s\S]*?drawLayer\(hoverContext,[\s\S]*?true\);/,
  'pointer movement should preserve the high-resolution static layer and redraw only the local hover layer'
);
assert.match(
  newtabHtml,
  /\.x-nt-wallpaper-effect-canvas,\s*\.x-nt-wallpaper-effect-hover-canvas\s*\{/,
  'base and hover canvases should share the same composited viewport styling'
);
assert.match(
  effectsSource,
  /visualPrefsChanged && previousType === prefs\.type[\s\S]*?scheduleRender\(PARAMETER_RENDER_DEBOUNCE_MS\)/,
  'continuous parameter input should debounce expensive full-layer renders'
);

process.stdout.write('new tab wallpaper effects tests passed\n');
