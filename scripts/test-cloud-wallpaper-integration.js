const assert = require('assert');
const fs = require('fs');

const wallpaper = fs.readFileSync('src/newtab/wallpaper.js', 'utf8');
const newtab = fs.readFileSync('src/newtab/newtab.js', 'utf8');
const background = fs.readFileSync('src/background/background.js', 'utf8');

function run() {
  assert.match(wallpaper, /action: 'cloudUploadWallpaper', record: nextWallpaper/);
  assert.match(wallpaper, /action: 'cloudDeleteWallpaper', id: targetWallpaper\.id/);
  assert.match(wallpaper, /refreshCustomWallpapers: loadCustomWallpapers/);
  assert.match(newtab, /message\.action === 'lumno:wallpapers-updated'/);
  assert.match(newtab, /action: 'cloudUploadShortcutIcon'/);
  assert.match(newtab, /action: 'cloudDeleteShortcutIcon'/);
  assert.match(background, /'cloudUploadWallpaper'/);
  assert.match(background, /'cloudDeleteWallpaper'/);
  assert.match(background, /'cloudUploadShortcutIcon'/);
  assert.match(background, /'cloudDeleteShortcutIcon'/);
  assert.match(background, /cloud-wallpaper-runtime\.js/);

  console.log('cloud wallpaper integration tests passed');
}

run();
