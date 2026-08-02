const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ICON_DIRECTORY = path.join(PROJECT_ROOT, 'assets/images/site-search');
const TILE_SIZE = 144;
const TILE_RADIUS = 30;

// Every built-in provider is rasterized into a self-contained app-style tile.
// Runtime surfaces therefore never need to interpret an SVG, fetch a favicon,
// or borrow the surrounding theme color to make a transparent mark legible.
const SITE_SEARCH_ICON_TILE_SPECS = Object.freeze([
  { key: 'yt', source: 'youtube.svg', background: '#FFF0F2', artworkSize: 96 },
  { key: 'bb', source: 'bilibili.svg', background: '#EAF9FE', artworkSize: 100 },
  { key: 'gh', source: 'github.svg', background: '#F1F2F4', artworkSize: 94 },
  { key: 'sf', source: 'stackoverflow.svg', background: '#FFF2E8', artworkSize: 94 },
  { key: 'mdn', source: 'mdn.svg', background: '#F2F3F5', artworkSize: 102 },
  { key: 'npm', source: 'npm.svg', background: '#FFF0F0', artworkSize: 100 },
  { key: 'hf', source: 'huggingface.png', background: '#FFF8DD', artworkSize: 112 },
  { key: 'gs', source: 'google-scholar.png', mode: 'cover' },
  { key: 'ss', source: 'semantic-scholar.svg', background: '#EDF3FF', artworkSize: 96 },
  { key: 'maps', source: 'google-maps.png', mode: 'cover' },
  { key: 'gpt', source: 'openai.svg', background: '#EAF7F2', artworkSize: 94 },
  { key: 'gm', source: 'gemini.svg', background: '#F1F4FF', artworkSize: 96 },
  { key: 'dbai', source: 'doubao-mascot.png', background: '#EAF4FF', artworkSize: 118 },
  { key: 'qw', source: 'qianwen-site.png', background: '#EEF1FF', artworkSize: 108 },
  { key: 'yb', source: 'yuanbao.svg', background: '#EAFBF3', artworkSize: 98 },
  { key: 'mx', source: 'minimax-agent.png', mode: 'cover' },
  { key: 'ds', source: 'deepseek.svg', background: '#EEF1FF', artworkSize: 98 },
  { key: 'kimi', source: 'kimi.svg', mode: 'cover' },
  { key: 'pplx', source: 'perplexity.svg', background: '#EAF6F5', artworkSize: 96 },
  { key: 'metaso', source: 'metaso-site.png', mode: 'cover' },
  { key: 'felo', source: 'felo.svg', background: '#EDF5FF', artworkSize: 104 },
  { key: 'bd', source: 'baidu.svg', background: '#EEF0FF', artworkSize: 98 },
  { key: 'bi', source: 'bing.svg', background: '#EAF8FC', artworkSize: 92 },
  { key: 'gg', source: 'google.svg', background: '#F6F7F9', artworkSize: 96 },
  { key: 'ddg', source: 'duckduckgo.svg', background: '#FFF4ED', artworkSize: 100 },
  { key: 'br', source: 'brave.svg', background: '#FFF2EC', artworkSize: 104 },
  { key: 'eco', source: 'ecosia.svg', background: '#EDF8EC', artworkSize: 102 },
  { key: 'sg', source: 'sogou.svg', background: '#FFF1EB', artworkSize: 100 },
  { key: 'so360', source: '360-search-mark.png', background: '#EDF8EF', artworkSize: 112 },
  { key: 'yh', source: 'yahoo.svg', background: '#F4EDFF', artworkSize: 96 },
  { key: 'yx', source: 'yandex.svg', background: '#FFF1ED', artworkSize: 94 },
  { key: 'sm', source: 'shenma-search.png', mode: 'cover' },
  { key: 'zh', source: 'zhihu.png', mode: 'cover' },
  { key: 'db', source: 'douban.svg', background: '#EDF8EF', artworkSize: 102 },
  { key: 'jj', source: 'juejin.svg', background: '#EDF4FF', artworkSize: 104 },
  { key: 'tb', source: 'taobao.png', mode: 'cover' },
  { key: 'tm', source: 'tmall.png', mode: 'cover' },
  { key: 'wx', source: 'sogou.svg', background: '#FFF1EB', artworkSize: 100 },
  { key: 'tw', source: 'x.svg', mode: 'cover' },
  { key: 'rd', source: 'reddit.png', mode: 'cover' },
  { key: 'wb', source: 'weibo.png', mode: 'cover' },
  { key: 'xhs', source: 'xiaohongshu.png', mode: 'cover' },
  { key: 'dy', source: 'douyin.png', mode: 'cover' },
  { key: 'jd', source: 'jd-joy.png', mode: 'cover' },
  { key: 'wk', source: 'wikipedia.svg', background: '#F2F3F5', artworkSize: 96 },
  { key: 'zw', source: 'wikipedia.svg', background: '#F2F3F5', artworkSize: 96 }
]);

function getRoundedMaskArgs() {
  return [
    '(',
    '-size', `${TILE_SIZE}x${TILE_SIZE}`,
    'xc:none',
    '-fill', '#FFFFFF',
    '-draw', `roundrectangle 0,0 ${TILE_SIZE - 1},${TILE_SIZE - 1} ${TILE_RADIUS},${TILE_RADIUS}`,
    ')'
  ];
}

function prepareMagickSource(sourcePath, spec) {
  const providerKey = spec.key;
  if (sourcePath.endsWith('.svg')) {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), `lumno-icon-${providerKey}-`)
    );
    const renderResult = spawnSync(
      'qlmanage',
      ['-t', '-s', '512', '-o', temporaryDirectory, sourcePath],
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    );
    const temporaryPath = path.join(
      temporaryDirectory,
      `${path.basename(sourcePath)}.png`
    );
    if (renderResult.status !== 0 || !fs.existsSync(temporaryPath)) {
      fs.rmSync(temporaryDirectory, { force: true, recursive: true });
      throw new Error(
        `Failed to render ${providerKey} through Quick Look: ` +
        (renderResult.stderr || renderResult.stdout || 'renderer error')
      );
    }
    return Object.freeze({
      path: temporaryPath,
      removeWhite: spec.mode !== 'cover',
      cleanup() {
        fs.rmSync(temporaryDirectory, { force: true, recursive: true });
      }
    });
  }
  return Object.freeze({ path: sourcePath, removeWhite: false, cleanup() {} });
}

function buildTile(spec) {
  const sourcePath = path.join(ICON_DIRECTORY, spec.source);
  const outputPath = path.join(ICON_DIRECTORY, `tile-${spec.key}.png`);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source artwork for ${spec.key}: ${sourcePath}`);
  }
  const preparedSource = prepareMagickSource(sourcePath, spec);

  const args = spec.mode === 'cover'
    ? [
        preparedSource.path,
        '-auto-orient',
        '-background', 'none',
        '-resize', `${TILE_SIZE}x${TILE_SIZE}^`,
        '-gravity', 'center',
        '-extent', `${TILE_SIZE}x${TILE_SIZE}`,
        ...getRoundedMaskArgs(),
        '-alpha', 'set',
        '-compose', 'DstIn',
        '-composite'
      ]
    : [
        '-size', `${TILE_SIZE}x${TILE_SIZE}`,
        'xc:none',
        '-fill', spec.background,
        '-draw', `roundrectangle 0,0 ${TILE_SIZE - 1},${TILE_SIZE - 1} ${TILE_RADIUS},${TILE_RADIUS}`,
        '(',
        preparedSource.path,
        '-auto-orient',
        '-background', 'none',
        ...(preparedSource.removeWhite
          ? ['-alpha', 'set', '-fuzz', '4%', '-transparent', '#FFFFFF']
          : []),
        '-resize', `${spec.artworkSize}x${spec.artworkSize}`,
        ')',
        '-gravity', 'center',
        '-compose', 'Over',
        '-composite'
      ];

  const result = spawnSync(
    'magick',
    [...args, '-strip', `PNG32:${outputPath}`],
    { cwd: PROJECT_ROOT, encoding: 'utf8' }
  );
  preparedSource.cleanup();
  if (result.status !== 0) {
    throw new Error(
      `Failed to build ${spec.key}: ${result.stderr || result.stdout || 'ImageMagick error'}`
    );
  }
  return outputPath;
}

function generateSiteSearchIconTiles() {
  const seenKeys = new Set();
  SITE_SEARCH_ICON_TILE_SPECS.forEach((spec) => {
    if (seenKeys.has(spec.key)) {
      throw new Error(`Duplicate provider tile key: ${spec.key}`);
    }
    seenKeys.add(spec.key);
    buildTile(spec);
  });
  return SITE_SEARCH_ICON_TILE_SPECS.length;
}

if (require.main === module) {
  const generatedCount = generateSiteSearchIconTiles();
  console.log(`Generated ${generatedCount} local site-search icon tiles.`);
}

module.exports = Object.freeze({
  ICON_DIRECTORY,
  SITE_SEARCH_ICON_TILE_SPECS,
  TILE_RADIUS,
  TILE_SIZE,
  generateSiteSearchIconTiles
});
