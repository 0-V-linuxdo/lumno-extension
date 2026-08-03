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
