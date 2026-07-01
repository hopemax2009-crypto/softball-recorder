"""產生正方形 PWA / iOS 主畫面圖示。執行：python scripts/generate-icons.py"""
from __future__ import annotations

import math
import zlib
import struct
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (45, 106, 79)
BALL = (248, 250, 252)
STITCH = (220, 38, 38)
CLIP = (255, 255, 255)
CLIP_LINE = (45, 106, 79)
CHECK = (22, 163, 74)


def set_pixel(px, size: int, x: int, y: int, color: tuple[int, int, int]):
    if 0 <= x < size and 0 <= y < size:
        px[y * size + x] = color


def fill_rect(px, size: int, x0: float, y0: float, x1: float, y1: float, color):
    for y in range(int(y0), math.ceil(y1)):
        for x in range(int(x0), math.ceil(x1)):
            set_pixel(px, size, x, y, color)


def fill_circle(px, size: int, cx: float, cy: float, r: float, color):
    r2 = r * r
    for y in range(int(cy - r), math.ceil(cy + r)):
        for x in range(int(cx - r), math.ceil(cx + r)):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            if dx * dx + dy * dy <= r2:
                set_pixel(px, size, x, y, color)


def fill_round_rect(px, size: int, x0: float, y0: float, x1: float, y1: float, radius: float, color):
    r = min(radius, (x1 - x0) / 2, (y1 - y0) / 2)
    fill_rect(px, size, x0 + r, y0, x1 - r, y1, color)
    fill_rect(px, size, x0, y0 + r, x1, y1 - r, color)
    fill_circle(px, size, x0 + r, y0 + r, r, color)
    fill_circle(px, size, x1 - r, y0 + r, r, color)
    fill_circle(px, size, x0 + r, y1 - r, r, color)
    fill_circle(px, size, x1 - r, y1 - r, r, color)


def quad_bezier(p0, p1, p2, t: float):
    u = 1 - t
    x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
    y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
    return x, y


def stroke_bezier(px, size: int, p0, p1, p2, width: float, color, steps: int = 64):
    prev = quad_bezier(p0, p1, p2, 0)
    for i in range(1, steps + 1):
        cur = quad_bezier(p0, p1, p2, i / steps)
        dist = math.hypot(cur[0] - prev[0], cur[1] - prev[1])
        n = max(1, int(dist))
        for j in range(n + 1):
            t = j / n
            x = prev[0] + (cur[0] - prev[0]) * t
            y = prev[1] + (cur[1] - prev[1]) * t
            fill_circle(px, size, x, y, width / 2, color)
        prev = cur


def draw_check(px, size: int, x0: float, y0: float, scale: float):
    stroke_bezier(px, size, (x0, y0 + 6 * scale), (x0 + 3 * scale, y0 + 9 * scale), (x0 + 6 * scale, y0 + 12 * scale), 4 * scale, CHECK, 8)
    stroke_bezier(px, size, (x0 + 6 * scale, y0 + 12 * scale), (x0 + 12 * scale, y0 + 6 * scale), (x0 + 18 * scale, y0 - 6 * scale), 4 * scale, CHECK, 8)


def render_icon(size: int) -> list[tuple[int, int, int]]:
    px = [BG for _ in range(size * size)]
    s = size / 512

    fill_circle(px, size, 256 * s, 228 * s, 118 * s, BALL)
    stroke_bezier(px, size, (168 * s, 188 * s), (256 * s, 128 * s), (344 * s, 188 * s), 10 * s, STITCH)
    stroke_bezier(px, size, (168 * s, 268 * s), (256 * s, 328 * s), (344 * s, 268 * s), 10 * s, STITCH)
    fill_round_rect(px, size, 312 * s, 312 * s, 424 * s, 448 * s, 16 * s, CLIP)
    fill_rect(px, size, 332 * s, 340 * s, 404 * s, 348 * s, CLIP_LINE)
    fill_rect(px, size, 332 * s, 364 * s, 388 * s, 372 * s, CLIP_LINE)
    fill_rect(px, size, 332 * s, 388 * s, 396 * s, 396 * s, CLIP_LINE)
    draw_check(px, size, 332 * s, 400 * s, s)
    return px


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def encode_png(size: int, pixels: list[tuple[int, int, int]]) -> bytes:
    raw = bytearray()
    row = size * 3
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r, g, b = pixels[y * size + x]
            raw.extend((r, g, b))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + png_chunk(b"IEND", b"")
    )


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, px in [
        ("apple-touch-icon.png", 180),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
    ]:
        data = encode_png(px, render_icon(px))
        path = OUT_DIR / name
        path.write_bytes(data)
        print(f"Wrote {name} ({px}x{px}, {len(data)} bytes)")


if __name__ == "__main__":
    main()
