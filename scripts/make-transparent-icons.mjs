import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'assets/original/icon-512.png';
const OUTPUT_DIR = 'public/icons';
const SCRATCH_DIR = 'scratch/icon-previews';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));

async function removeExteriorWhite() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const count = width * height;
  const background = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const isWhite = (index) => {
    const offset = index * channels;
    return data[offset] >= 245 && data[offset + 1] >= 245 && data[offset + 2] >= 245;
  };
  const enqueue = (index) => {
    if (!background[index] && isWhite(index)) {
      background[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  const original = Buffer.from(data);
  const alpha = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    const offset = index * channels;
    if (background[index]) {
      alpha[index] = 0;
      continue;
    }
    alpha[index] = data[offset + 3];
    const x = index % width;
    const y = Math.floor(index / width);
    let nearest = -1;
    let nearestLuma = 256;
    let touchesBackground = false;
    // A 1 px feather estimates antialias coverage from the darkest adjacent
    // foreground pixel; interior whites are untouched because they were not
    // connected to the image edge by the flood fill.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const candidate = ny * width + nx;
        if (background[candidate]) {
          touchesBackground = true;
          continue;
        }
        const candidateOffset = candidate * channels;
        const luma = (data[candidateOffset] + data[candidateOffset + 1] + data[candidateOffset + 2]) / 3;
        if (luma < nearestLuma) {
          nearest = candidate;
          nearestLuma = luma;
        }
      }
    }
    if (nearest < 0 || !touchesBackground) continue;
    const pixelLuma = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
    if (pixelLuma < 170) continue;
    const nearestOffset = nearest * channels;
    let numerator = 0;
    let denominator = 0;
    for (let channel = 0; channel < 3; channel++) {
      const foreground = data[nearestOffset + channel];
      const contrast = foreground - 255;
      numerator += (data[offset + channel] - 255) * contrast;
      denominator += contrast * contrast;
    }
    const coverage = denominator > 0 ? clamp(numerator / denominator) : 1;
    if (coverage > 0 && coverage < 0.999) {
      alpha[index] = Math.round(coverage * data[offset + 3]);
      for (let channel = 0; channel < 3; channel++) {
        // Un-matte the semitransparent antialias pixel against white.
        const a = alpha[index] / 255;
        original[offset + channel] = Math.max(0, Math.min(255,
          Math.round((data[offset + channel] - (1 - a) * 255) / a)));
      }
    }
  }

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (alpha[index] < 4) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error('Source image contains no foreground.');

  const contentWidth = right - left + 1;
  const contentHeight = bottom - top + 1;
  const padding = Math.max(3, Math.round(Math.max(contentWidth, contentHeight) * 0.035));
  const squareSize = Math.max(contentWidth, contentHeight) + padding * 2;
  const square = Buffer.alloc(squareSize * squareSize * 4);
  const pasteX = Math.floor((squareSize - contentWidth) / 2);
  const pasteY = Math.floor((squareSize - contentHeight) / 2);
  for (let y = 0; y < contentHeight; y++) {
    for (let x = 0; x < contentWidth; x++) {
      const sourceIndex = (top + y) * width + left + x;
      const targetOffset = ((pasteY + y) * squareSize + pasteX + x) * 4;
      const sourceOffset = sourceIndex * channels;
      square[targetOffset] = original[sourceOffset];
      square[targetOffset + 1] = original[sourceOffset + 1];
      square[targetOffset + 2] = original[sourceOffset + 2];
      square[targetOffset + 3] = alpha[sourceIndex];
    }
  }
  return { square, squareSize };
}

async function resizedPng(source, size, { outline = false, background = null } = {}) {
  let image = sharp(source.square, { raw: { width: source.squareSize, height: source.squareSize, channels: 4 } })
    .resize(size, size, { fit: 'contain', kernel: 'lanczos3' });
  let pixels = await image.png().toBuffer();
  if (outline) {
    const alpha = await sharp(pixels).extractChannel('alpha').dilate(1).png().toBuffer();
    const halo = await sharp({ create: { width: size, height: size, channels: 3, background: { r: 245, g: 245, b: 245 } } })
      .joinChannel(alpha).png().toBuffer();
    pixels = await sharp(halo).composite([{ input: pixels }]).png().toBuffer();
  }
  if (background) {
    pixels = await sharp({ create: { width: size, height: size, channels: 4, background } })
      .composite([{ input: pixels }]).png().toBuffer();
  }
  return pixels;
}

function icoFromPngs(entries) {
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, png }, index) => {
    const at = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, at);
    header.writeUInt8(size === 256 ? 0 : size, at + 1);
    header.writeUInt8(0, at + 2);
    header.writeUInt8(0, at + 3);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...entries.map(({ png }) => png)]);
}

async function writePreviews(png32, png16) {
  await mkdir(SCRATCH_DIR, { recursive: true });
  const tiles = [];
  for (const [label, icon] of [['32', png32], ['32', png32], ['16', png16], ['16', png16]]) {
    const slot = tiles.length;
    const color = slot % 2 === 0 ? '#202124' : '#ffffff';
    const size = Number(label);
    const scale = 5;
    const scaled = await sharp(icon).resize(size * scale, size * scale, { kernel: 'nearest' }).png().toBuffer();
    const tile = await sharp({ create: { width: 180, height: 180, channels: 4, background: color } })
      .composite([{ input: scaled, left: Math.floor((180 - size * scale) / 2), top: Math.floor((180 - size * scale) / 2) }]).png().toBuffer();
    tiles.push({ input: tile, left: (slot % 2) * 180, top: Math.floor(slot / 2) * 180 });
  }
  await sharp({ create: { width: 360, height: 360, channels: 4, background: '#d9d9d9' } })
    .composite(tiles).png().toFile(`${SCRATCH_DIR}/icon-previews.png`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
const source = await removeExteriorWhite();
const output = new Map();
// Favicon raster sizes get a subtle light 1 px contour for dark browser chrome.
for (const size of [16, 32, 48, 192, 512]) {
  output.set(size, await resizedPng(source, size, { outline: size <= 48 }));
}
await writeFile(`${OUTPUT_DIR}/icon-32.png`, output.get(32));
await writeFile(`${OUTPUT_DIR}/icon-192.png`, output.get(192));
await writeFile(`${OUTPUT_DIR}/icon-512.png`, output.get(512));
await writeFile(`${OUTPUT_DIR}/favicon.ico`, icoFromPngs([16, 32, 48].map((size) => ({ size, png: output.get(size) }))));

// iOS applies black behind a transparent apple-touch icon; keep this one white.
const apple = await resizedPng(source, 180, { background: { r: 255, g: 255, b: 255, alpha: 1 } });
await writeFile(`${OUTPUT_DIR}/apple-touch-icon.png`, apple);
// Maskable icons need an opaque, full-bleed canvas and an 80%-sized centered mark.
const maskableLogo = await resizedPng(source, 410);
const maskable = await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
  .composite([{ input: maskableLogo, left: 51, top: 51 }]).png().toBuffer();
await writeFile(`${OUTPUT_DIR}/maskable-512.png`, maskable);
await sharp(source.square, { raw: { width: source.squareSize, height: source.squareSize, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile('public/brand/logo.webp');
await writePreviews(output.get(32), output.get(16));
console.log(`Generated transparent icons from ${SOURCE}; preview: ${SCRATCH_DIR}/icon-previews.png`);
