/**
 * 產生正方形 PWA / iOS 主畫面圖示（滿版、無透明邊、無圓角留白）
 * 執行：node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [45, 106, 79];
const BALL = [248, 250, 252];
const STITCH = [220, 38, 38];
const CLIP = [255, 255, 255];
const CLIP_LINE = [45, 106, 79, 90];
const CHECK = [22, 163, 74];

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function setPixel(data, size, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  if (a >= 255) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
    return;
  }
  const srcA = a / 255;
  const dstA = data[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  data[i] = Math.round((r * srcA + data[i] * dstA * (1 - srcA)) / outA);
  data[i + 1] = Math.round((g * srcA + data[i + 1] * dstA * (1 - srcA)) / outA);
  data[i + 2] = Math.round((b * srcA + data[i + 2] * dstA * (1 - srcA)) / outA);
  data[i + 3] = Math.round(outA * 255);
}

function fillRect(data, size, x0, y0, x1, y1, color) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) setPixel(data, size, x, y, color);
  }
}

function fillCircle(data, size, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(data, size, x, y, color);
    }
  }
}

function fillRoundRect(data, size, x0, y0, x1, y1, radius, color) {
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2);
  fillRect(data, size, x0 + r, y0, x1 - r, y1, color);
  fillRect(data, size, x0, y0 + r, x1, y1 - r, color);
  fillCircle(data, size, x0 + r, y0 + r, r, color);
  fillCircle(data, size, x1 - r, y0 + r, r, color);
  fillCircle(data, size, x0 + r, y1 - r, r, color);
  fillCircle(data, size, x1 - r, y1 - r, r, color);
}

function strokeBezier(data, size, points, width, color, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x =
      u * u * points[0].x +
      2 * u * t * points[1].x +
      t * t * points[2].x;
    const y =
      u * u * points[0].y +
      2 * u * t * points[1].y +
      t * t * points[2].y;
    pts.push({ x, y });
  }
  const w = Math.max(1, width);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len));
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      fillCircle(data, size, x, y, w / 2, color);
    }
  }
}

function drawCheck(data, size, x0, y0, scale, color) {
  const s = scale;
  const pts = [
    { x: x0, y: y0 + 6 * s },
    { x: x0 + 6 * s, y: y0 + 12 * s },
    { x: x0 + 18 * s, y: y0 - 6 * s },
  ];
  strokeBezier(data, size, [pts[0], pts[0], pts[1]], 4 * s, color, 1);
  strokeBezier(data, size, [pts[1], pts[1], pts[2]], 4 * s, color, 1);
}

function renderIcon(size) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    data[o] = BG[0];
    data[o + 1] = BG[1];
    data[o + 2] = BG[2];
    data[o + 3] = 255;
  }

  const s = size / 512;

  fillCircle(data, size, 256 * s, 228 * s, 118 * s, BALL);

  strokeBezier(
    data,
    size,
    [
      { x: 168 * s, y: 188 * s },
      { x: 256 * s, y: 128 * s },
      { x: 344 * s, y: 188 * s },
    ],
    10 * s,
    STITCH
  );
  strokeBezier(
    data,
    size,
    [
      { x: 168 * s, y: 268 * s },
      { x: 256 * s, y: 328 * s },
      { x: 344 * s, y: 268 * s },
    ],
    10 * s,
    STITCH
  );

  fillRoundRect(data, size, 312 * s, 312 * s, 424 * s, 448 * s, 16 * s, CLIP);
  fillRect(data, size, 332 * s, 340 * s, 404 * s, 348 * s, CLIP_LINE);
  fillRect(data, size, 332 * s, 364 * s, 388 * s, 372 * s, CLIP_LINE);
  fillRect(data, size, 332 * s, 388 * s, 396 * s, 396 * s, CLIP_LINE);
  drawCheck(data, size, 332 * s, 400 * s, s, CHECK);

  return data;
}

function encodePng(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

for (const [name, px] of outputs) {
  const rgba = renderIcon(px);
  writeFileSync(join(outDir, name), encodePng(px, rgba));
  console.log(`Wrote ${name} (${px}x${px})`);
}
