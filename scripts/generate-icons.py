"""從 icon-source.png 產生正方形 PWA / iOS 圖示。執行：python scripts/generate-icons.py"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SOURCE = OUT_DIR / "icon-source.png"


def load_square_source() -> Image.Image:
    if not SOURCE.exists():
        raise FileNotFoundError(f"找不到 {SOURCE}，請放入第一版圖示原始檔")
    img = Image.open(SOURCE).convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = load_square_source()
    for name, px in [
        ("apple-touch-icon.png", 180),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
    ]:
        out = source.resize((px, px), Image.Resampling.LANCZOS)
        path = OUT_DIR / name
        out.save(path, format="PNG", optimize=True)
        print(f"Wrote {name} ({px}x{px})")


if __name__ == "__main__":
    main()
