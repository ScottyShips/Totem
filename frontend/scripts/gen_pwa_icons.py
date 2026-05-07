"""Generate Totem PWA icons — a 'totem' wordmark in laser fuchsia→cyan→green.

One-shot dev tool. Requires Pillow (not a runtime dep). Run with any Python:

    python frontend/scripts/gen_pwa_icons.py

Outputs:
    frontend/public/icons/icon-192.png       (manifest)
    frontend/public/icons/icon-512.png       (manifest)
    frontend/public/icons/apple-touch-icon.png  (180x180, iOS home screen)

The 512 master is rendered then downsampled to the smaller sizes for crispness.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Output paths (relative to repo root)
THIS_DIR = Path(__file__).resolve().parent
PUBLIC_ICONS = THIS_DIR.parent / "public" / "icons"

# Brand
BG = (9, 9, 11)  # zinc-950 — matches manifest theme_color
WORDMARK = "totem"
FONT_PATH = "C:/Windows/Fonts/seguibl.ttf"  # Segoe UI Black

# Laser gradient stops: fuchsia → cyan → neon green
GRADIENT_STOPS = [
    (0.00, (217, 70, 239)),   # fuchsia-500
    (0.50, (6, 182, 212)),    # cyan-500
    (1.00, (74, 222, 128)),   # green-400
]


def make_gradient(width: int, height: int, stops: list[tuple[float, tuple[int, int, int]]]) -> Image.Image:
    """Horizontal multi-stop linear gradient."""
    img = Image.new("RGB", (width, height))
    pixels = img.load()
    assert pixels is not None
    for x in range(width):
        t = x / max(width - 1, 1)
        # find the segment containing t
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                local = (t - t0) / max(t1 - t0, 1e-9)
                r = round(c0[0] + (c1[0] - c0[0]) * local)
                g = round(c0[1] + (c1[1] - c0[1]) * local)
                b = round(c0[2] + (c1[2] - c0[2]) * local)
                for y in range(height):
                    pixels[x, y] = (r, g, b)
                break
    return img


def render_master(size: int = 512) -> Image.Image:
    """Render the master 512x512 icon."""
    canvas = Image.new("RGB", (size, size), BG)

    # Maskable safe zone: inner ~80% diameter circle. Keep text within ~70% width.
    target_text_width = int(size * 0.70)

    # Binary search the right font size to hit target_text_width
    lo, hi = 40, 400
    chosen_size = lo
    while lo <= hi:
        mid = (lo + hi) // 2
        font = ImageFont.truetype(FONT_PATH, mid)
        bbox = font.getbbox(WORDMARK)
        text_w = bbox[2] - bbox[0]
        if text_w <= target_text_width:
            chosen_size = mid
            lo = mid + 1
        else:
            hi = mid - 1

    font = ImageFont.truetype(FONT_PATH, chosen_size)
    bbox = font.getbbox(WORDMARK)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    # bbox y0 is the top of the actual ink, accounting for ascenders
    text_x = (size - text_w) // 2 - bbox[0]
    text_y = (size - text_h) // 2 - bbox[1]

    # Build a text mask — single-channel alpha
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).text((text_x, text_y), WORDMARK, font=font, fill=255)

    # Paint the gradient through the text mask
    gradient = make_gradient(size, size, GRADIENT_STOPS)
    canvas.paste(gradient, (0, 0), mask)

    # Soft outer glow — re-render text bigger, blur, blend on top with low alpha
    glow_font = ImageFont.truetype(FONT_PATH, int(chosen_size * 1.02))
    glow_bbox = glow_font.getbbox(WORDMARK)
    glow_w = glow_bbox[2] - glow_bbox[0]
    glow_h = glow_bbox[3] - glow_bbox[1]
    glow_x = (size - glow_w) // 2 - glow_bbox[0]
    glow_y = (size - glow_h) // 2 - glow_bbox[1]

    glow_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glow_mask).text((glow_x, glow_y), WORDMARK, font=glow_font, fill=120)
    glow_mask = glow_mask.filter(ImageFilter.GaussianBlur(radius=size * 0.025))

    # Glow color is mid-gradient (cyan) — lasers reading as halo
    glow_layer = Image.new("RGB", (size, size), (139, 92, 246))  # violet-500 halo
    canvas.paste(glow_layer, (0, 0), glow_mask)

    # Re-paint the crisp gradient text on top so the glow doesn't smear it
    canvas.paste(gradient, (0, 0), mask)

    return canvas


def main() -> None:
    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)
    master = render_master(512)

    out_512 = PUBLIC_ICONS / "icon-512.png"
    out_192 = PUBLIC_ICONS / "icon-192.png"
    out_apple = PUBLIC_ICONS / "apple-touch-icon.png"

    master.save(out_512, "PNG", optimize=True)
    master.resize((192, 192), Image.LANCZOS).save(out_192, "PNG", optimize=True)
    master.resize((180, 180), Image.LANCZOS).save(out_apple, "PNG", optimize=True)

    print(f"Wrote {out_512.relative_to(THIS_DIR.parent.parent)}")
    print(f"Wrote {out_192.relative_to(THIS_DIR.parent.parent)}")
    print(f"Wrote {out_apple.relative_to(THIS_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
