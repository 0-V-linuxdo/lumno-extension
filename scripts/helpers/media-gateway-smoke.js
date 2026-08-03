const crypto = require('crypto');
const zlib = require('zlib');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  const output = Buffer.alloc(4);
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return output;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, typeBytes, data, crc32(Buffer.concat([typeBytes, data]))]);
}

function createNormalizedIconPng() {
  const width = 128;
  const height = 128;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + (width * 4));
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + (x * 4);
      row[offset] = 70;
      row[offset + 1] = 120 + ((x + y) % 40);
      row[offset + 2] = 210;
      row[offset + 3] = 255;
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

async function parseJsonResponse(response, label) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_error) {
    body = null;
  }
  if (!response.ok) {
    throw new Error(`${label}: ${response.status} ${text.slice(0, 300)}`);
  }
  return body;
}

async function smokeMediaGateway({ projectUrl, publishableKey, accessToken }) {
  const image = createNormalizedIconPng();
  const shortcutId = `smoke-${crypto.randomUUID()}`;
  const clientAssetId = `shortcut-icon-${crypto.createHash('sha256').update(shortcutId).digest('hex')}`;
  const form = new FormData();
  form.set('asset_kind', 'shortcut_icon');
  form.set('client_asset_id', clientAssetId);
  form.set('original_name', shortcutId);
  form.set('image', new Blob([image], { type: 'image/png' }), 'icon.png');
  const commonHeaders = {
    apikey: publishableKey,
    Authorization: `Bearer ${accessToken}`
  };
  const upload = await parseJsonResponse(await fetch(`${projectUrl}/functions/v1/media-asset`, {
    method: 'POST',
    headers: commonHeaders,
    body: form
  }), 'media gateway upload failed');
  const asset = upload && upload.asset;
  if (!asset || !asset.storage_path) throw new Error('media gateway returned no asset path');

  const downloadResponse = await fetch(`${projectUrl}/functions/v1/media-asset`, {
    method: 'POST',
    headers: { ...commonHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'download', path: asset.storage_path })
  });
  if (!downloadResponse.ok) {
    throw new Error(`media gateway download failed: ${downloadResponse.status} ${(await downloadResponse.text()).slice(0, 300)}`);
  }
  if ((await downloadResponse.arrayBuffer()).byteLength !== image.byteLength) {
    throw new Error('media gateway download byte count mismatch');
  }

  await parseJsonResponse(await fetch(`${projectUrl}/functions/v1/media-asset`, {
    method: 'POST',
    headers: { ...commonHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', client_asset_id: clientAssetId })
  }), 'media gateway delete failed');
  return { clientAssetId, byteSize: image.byteLength };
}

module.exports = {
  createNormalizedIconPng,
  smokeMediaGateway
};
