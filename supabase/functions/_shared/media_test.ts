import {
  assertMediaShape,
  inspectImage,
  MAX_ICON_BYTES,
  MediaRequestError
} from './media.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function writeUint32Be(target: number[], value: number): void {
  target.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function pngChunk(type: string, data: number[]): number[] {
  const result: number[] = [];
  writeUint32Be(result, data.length);
  result.push(...Array.from(type).map((char) => char.charCodeAt(0)), ...data, 0, 0, 0, 0);
  return result;
}

function makePng(width: number, height: number): Uint8Array {
  const ihdr: number[] = [];
  writeUint32Be(ihdr, width);
  writeUint32Be(ihdr, height);
  ihdr.push(8, 6, 0, 0, 0);
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...pngChunk('IHDR', ihdr),
    ...pngChunk('IDAT', [0]),
    ...pngChunk('IEND', [])
  ]);
}

function makeWebp(width: number, height: number, extraChunk = ''): Uint8Array {
  const chunks: number[] = [
    ...Array.from('VP8X').map((char) => char.charCodeAt(0)),
    10, 0, 0, 0,
    0, 0, 0, 0,
    (width - 1) & 0xff, ((width - 1) >>> 8) & 0xff, ((width - 1) >>> 16) & 0xff,
    (height - 1) & 0xff, ((height - 1) >>> 8) & 0xff, ((height - 1) >>> 16) & 0xff,
    ...Array.from('VP8 ').map((char) => char.charCodeAt(0)),
    10, 0, 0, 0,
    0, 0, 0, 0x9d, 0x01, 0x2a,
    width & 0xff, (width >>> 8) & 0x3f,
    height & 0xff, (height >>> 8) & 0x3f
  ];
  if (extraChunk) {
    chunks.push(
      ...Array.from(extraChunk).map((char) => char.charCodeAt(0)),
      2, 0, 0, 0,
      1, 2
    );
  }
  const bytes = [
    ...Array.from('RIFF').map((char) => char.charCodeAt(0)),
    0, 0, 0, 0,
    ...Array.from('WEBP').map((char) => char.charCodeAt(0)),
    ...chunks
  ];
  const riffSize = bytes.length - 8;
  bytes[4] = riffSize & 0xff;
  bytes[5] = (riffSize >>> 8) & 0xff;
  bytes[6] = (riffSize >>> 16) & 0xff;
  bytes[7] = (riffSize >>> 24) & 0xff;
  return Uint8Array.from(bytes);
}

Deno.test('normalized media structures and dimensions are accepted', () => {
  const iconBytes = makePng(128, 128);
  const icon = inspectImage(iconBytes, 'image/png');
  assert(icon.width === 128 && icon.height === 128, 'PNG dimensions should come from bytes');
  assertMediaShape('shortcut_icon', icon, iconBytes.length);

  const wallpaperBytes = makeWebp(1920, 1080);
  const thumbnailBytes = makeWebp(480, 270);
  const wallpaper = inspectImage(wallpaperBytes, 'image/webp');
  const thumbnail = inspectImage(thumbnailBytes, 'image/webp');
  assertMediaShape('wallpaper', wallpaper, wallpaperBytes.length, thumbnail, thumbnailBytes.length);
});

Deno.test('metadata, trailing bytes, MIME spoofing, and oversize icons are rejected', () => {
  const cases: Array<() => unknown> = [
    () => inspectImage(makeWebp(1920, 1080, 'XMP '), 'image/webp'),
    () => inspectImage(Uint8Array.from([...makePng(128, 128), 1]), 'image/png'),
    () => inspectImage(makePng(128, 128), 'image/webp'),
    () => assertMediaShape('shortcut_icon', inspectImage(makePng(128, 128), 'image/png'), MAX_ICON_BYTES + 1)
  ];
  for (const attack of cases) {
    let rejected = false;
    try {
      attack();
    } catch (error) {
      rejected = error instanceof MediaRequestError;
    }
    assert(rejected, 'confused or oversized media should be rejected');
  }
});
