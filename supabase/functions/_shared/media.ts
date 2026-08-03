export const MEDIA_BUCKET = 'lumno-user-media';
export const MAX_WALLPAPER_BYTES = 2 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 160 * 1024;
export const MAX_ICON_BYTES = 96 * 1024;
export const MAX_UPLOAD_BODY_BYTES = MAX_WALLPAPER_BYTES + MAX_THUMBNAIL_BYTES + (32 * 1024);

export type MediaKind = 'wallpaper' | 'shortcut_icon';

export type InspectedImage = {
  mimeType: 'image/png' | 'image/webp';
  width: number;
  height: number;
};

export class MediaRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'MediaRequestError';
    this.status = status;
    this.code = code;
  }
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] << 24) >>> 0) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]) >>> 0;
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    ((bytes[offset + 3] << 24) >>> 0)) >>> 0;
}

function readUint24Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function inspectPng(bytes: Uint8Array): InspectedImage {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 45 || signature.some((value, index) => bytes[index] !== value)) {
    throw new MediaRequestError(400, 'invalid_png');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let sawIdat = false;
  let sawIend = false;
  while (offset + 12 <= bytes.length) {
    const chunkLength = readUint32Be(bytes, offset);
    const chunkType = ascii(bytes, offset + 4, 4);
    const chunkEnd = offset + 12 + chunkLength;
    if (chunkEnd > bytes.length) throw new MediaRequestError(400, 'invalid_png');
    if (chunkType === 'IHDR') {
      if (offset !== 8 || chunkLength !== 13 || width || height) {
        throw new MediaRequestError(400, 'invalid_png');
      }
      width = readUint32Be(bytes, offset + 8);
      height = readUint32Be(bytes, offset + 12);
      const bitDepth = bytes[offset + 16];
      const colorType = bytes[offset + 17];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new MediaRequestError(400, 'invalid_png_encoding');
      }
    } else if (chunkType === 'IDAT') {
      if (!width || !height || sawIend) throw new MediaRequestError(400, 'invalid_png');
      sawIdat = true;
    } else if (chunkType === 'IEND') {
      if (chunkLength !== 0 || !sawIdat || chunkEnd !== bytes.length) {
        throw new MediaRequestError(400, 'invalid_png');
      }
      sawIend = true;
    } else {
      // Canvas-generated icons do not need metadata or arbitrary ancillary
      // chunks. Rejecting them also prevents PNG files acting as small archives.
      throw new MediaRequestError(400, 'png_metadata_not_allowed');
    }
    offset = chunkEnd;
    if (sawIend) break;
  }
  if (!sawIend || width < 1 || height < 1) throw new MediaRequestError(400, 'invalid_png');
  return { mimeType: 'image/png', width, height };
}

function inspectWebp(bytes: Uint8Array): InspectedImage {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    throw new MediaRequestError(400, 'invalid_webp');
  }
  if (readUint32Le(bytes, 4) + 8 !== bytes.length) {
    throw new MediaRequestError(400, 'invalid_webp_length');
  }
  const allowedChunks = new Set(['VP8X', 'VP8 ', 'VP8L', 'ALPH']);
  let offset = 12;
  let width = 0;
  let height = 0;
  let imageChunks = 0;
  while (offset + 8 <= bytes.length) {
    const chunkType = ascii(bytes, offset, 4);
    const chunkLength = readUint32Le(bytes, offset + 4);
    const payloadOffset = offset + 8;
    const paddedEnd = payloadOffset + chunkLength + (chunkLength % 2);
    if (!allowedChunks.has(chunkType) || paddedEnd > bytes.length) {
      throw new MediaRequestError(400, 'webp_metadata_not_allowed');
    }
    if (chunkType === 'VP8X') {
      if (chunkLength !== 10 || (bytes[payloadOffset] & 0x2e) !== 0) {
        throw new MediaRequestError(400, 'webp_metadata_not_allowed');
      }
      width = readUint24Le(bytes, payloadOffset + 4) + 1;
      height = readUint24Le(bytes, payloadOffset + 7) + 1;
    } else if (chunkType === 'VP8L') {
      if (chunkLength < 5 || bytes[payloadOffset] !== 0x2f) {
        throw new MediaRequestError(400, 'invalid_webp');
      }
      imageChunks += 1;
      const b1 = bytes[payloadOffset + 1];
      const b2 = bytes[payloadOffset + 2];
      const b3 = bytes[payloadOffset + 3];
      const b4 = bytes[payloadOffset + 4];
      width ||= 1 + (((b2 & 0x3f) << 8) | b1);
      height ||= 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    } else if (chunkType === 'VP8 ') {
      if (chunkLength < 10 || bytes[payloadOffset + 3] !== 0x9d ||
          bytes[payloadOffset + 4] !== 0x01 || bytes[payloadOffset + 5] !== 0x2a) {
        throw new MediaRequestError(400, 'invalid_webp');
      }
      imageChunks += 1;
      width ||= (bytes[payloadOffset + 6] | (bytes[payloadOffset + 7] << 8)) & 0x3fff;
      height ||= (bytes[payloadOffset + 8] | (bytes[payloadOffset + 9] << 8)) & 0x3fff;
    }
    offset = paddedEnd;
  }
  if (offset !== bytes.length || imageChunks !== 1 || width < 1 || height < 1) {
    throw new MediaRequestError(400, 'invalid_webp');
  }
  return { mimeType: 'image/webp', width, height };
}

export function inspectImage(bytes: Uint8Array, expectedMimeType: string): InspectedImage {
  if (expectedMimeType === 'image/png') return inspectPng(bytes);
  if (expectedMimeType === 'image/webp') return inspectWebp(bytes);
  throw new MediaRequestError(400, 'unsupported_media_type');
}

export function assertMediaShape(
  kind: MediaKind,
  image: InspectedImage,
  imageBytes: number,
  thumbnail?: InspectedImage,
  thumbnailBytes = 0
): void {
  if (kind === 'shortcut_icon') {
    if (image.mimeType !== 'image/png' || imageBytes > MAX_ICON_BYTES ||
        image.width !== 128 || image.height !== 128 || thumbnail || thumbnailBytes !== 0) {
      throw new MediaRequestError(400, 'invalid_shortcut_icon_shape');
    }
    return;
  }
  const ratio = image.width / image.height;
  const thumbnailRatio = thumbnail ? thumbnail.width / thumbnail.height : 0;
  if (image.mimeType !== 'image/webp' || !thumbnail || thumbnail.mimeType !== 'image/webp' ||
      imageBytes > MAX_WALLPAPER_BYTES || thumbnailBytes > MAX_THUMBNAIL_BYTES ||
      image.width > 2560 || image.height > 2560 ||
      thumbnail.width > 480 || thumbnail.height > 480 ||
      Math.abs(ratio - (16 / 9)) > 0.015 || Math.abs(thumbnailRatio - (16 / 9)) > 0.015) {
    throw new MediaRequestError(400, 'invalid_wallpaper_shape');
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isLocalSupabase(): boolean {
  try {
    const hostname = new URL(Deno.env.get('SUPABASE_URL') || '').hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (_error) {
    return false;
  }
}

const SIGHTENGINE_ENDPOINT = 'https://api.sightengine.com/1.0/check.json';
export const SIGHTENGINE_OPERATION_COUNT = 4;
export const SIGHTENGINE_MODELS = [
  'nudity-2.1',
  'recreational_drug',
  'gambling',
  'violence',
  'gore-2.0',
  'weapon',
  'self-harm',
  'text-content-2.0'
].join(',');
const SIGHTENGINE_TEXT_CATEGORIES = [
  'sexual',
  'discriminatory',
  'extremism',
  'weapon',
  'drug',
  'self_harm',
  'violence',
  'platform_evasion',
  'content_trade',
  'money_transaction',
  'link'
].join(',');

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function probabilityAt(record: JsonRecord, path: string[]): number | null {
  let value: unknown = record;
  for (const segment of path) {
    const nested = asRecord(value);
    if (!nested || !(segment in nested)) return null;
    value = nested[segment];
  }
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

export type ModerationDecision = {
  allowed: boolean;
  reason: string;
};

export function evaluateSightengineResponse(payload: unknown): ModerationDecision {
  const root = asRecord(payload);
  const request = root ? asRecord(root.request) : null;
  if (!root || root.status !== 'success' || !request ||
      request.operations !== SIGHTENGINE_OPERATION_COUNT) {
    return { allowed: false, reason: 'invalid_response' };
  }

  const requiredProbabilities: Array<[string[], number]> = [
    [['nudity', 'sexual_activity'], 0.50],
    [['nudity', 'sexual_display'], 0.50],
    [['nudity', 'erotica'], 0.65],
    [['nudity', 'very_suggestive'], 0.90],
    [['recreational_drug', 'prob'], 0.70],
    [['gambling', 'prob'], 0.70],
    [['violence', 'prob'], 0.85],
    [['gore', 'prob'], 0.80],
    [['self-harm', 'prob'], 0.80],
    [['weapon', 'firearm_action', 'aiming_threat'], 0.70]
  ];
  for (const [path, rejectAt] of requiredProbabilities) {
    const probability = probabilityAt(root, path);
    if (probability === null) return { allowed: false, reason: 'invalid_response' };
    if (probability >= rejectAt) return { allowed: false, reason: path.join('.') };
  }

  const text = asRecord(root.text);
  if (!text || !Array.isArray(text.detected_categories) ||
      text.detected_categories.some((category) => typeof category !== 'string')) {
    return { allowed: false, reason: 'invalid_response' };
  }
  if (text.detected_categories.length > 0) {
    return { allowed: false, reason: 'text_content' };
  }
  return { allowed: true, reason: 'allowed' };
}

export function assertModerationConfigured(): void {
  const apiUser = String(Deno.env.get('SIGHTENGINE_API_USER') || '').trim();
  const apiSecret = String(Deno.env.get('SIGHTENGINE_API_SECRET') || '').trim();
  if (apiUser && apiSecret) return;
  if (isLocalSupabase() && Deno.env.get('LUMNO_MEDIA_MODERATION_ALLOW_LOCAL') === 'true') return;
  throw new MediaRequestError(503, 'media_moderation_unavailable');
}

export async function requireModeration(
  kind: MediaKind,
  bytes: Uint8Array,
  mimeType: string
): Promise<void> {
  const apiUser = String(Deno.env.get('SIGHTENGINE_API_USER') || '').trim();
  const apiSecret = String(Deno.env.get('SIGHTENGINE_API_SECRET') || '').trim();
  assertModerationConfigured();
  if (!apiUser || !apiSecret) return;

  const form = new FormData();
  form.set('models', SIGHTENGINE_MODELS);
  form.set('text_categories', SIGHTENGINE_TEXT_CATEGORIES);
  form.set('opt_lang', 'zh,en,ja');
  form.set('api_user', apiUser);
  form.set('api_secret', apiSecret);
  form.set('media', new File([bytes], kind === 'wallpaper' ? 'wallpaper.webp' : 'icon.png', {
    type: mimeType
  }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(SIGHTENGINE_ENDPOINT, {
      method: 'POST',
      body: form,
      redirect: 'error',
      signal: controller.signal
    });
    const raw = (await response.text()).slice(0, 64 * 1024);
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch (_error) {
      payload = null;
    }
    if (!response.ok) {
      throw new MediaRequestError(503, 'media_moderation_unavailable');
    }
    const decision = evaluateSightengineResponse(payload);
    if (!decision.allowed) {
      throw new MediaRequestError(
        decision.reason === 'invalid_response' ? 503 : 422,
        decision.reason === 'invalid_response'
          ? 'media_moderation_unavailable'
          : 'media_content_rejected'
      );
    }
  } catch (error) {
    if (error instanceof MediaRequestError) throw error;
    throw new MediaRequestError(503, 'media_moderation_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}
