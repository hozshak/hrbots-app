"""Platzhalter-App-Symbol und Startbild für HR Bots erzeugen (Pillow).

Aufruf:  python scripts/make-icon.py
Schreibt assets/images/icon.png (1024x1024, ohne Transparenz – Apple verlangt das) und
assets/images/splash-icon.png (512x512, transparent; app.json zeigt es 120 pt breit auf #07080b).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
BG = (7, 8, 11)
A1 = (110, 123, 255)  # Akzent
A2 = (228, 108, 255)  # zweiter Farbton für den Verlauf


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size):
    """diagonaler Verlauf A1 → A2"""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            px[x, y] = lerp(A1, A2, (x + y) / (2 * size - 2))
    return g


def bot_mask(size):
    """weiße Form eines Bot-Kopfes (Antenne, Kopf, Ohren) – Augen und Mund ausgespart"""
    s = size / 1024
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    r = lambda *v: [round(c * s) for c in v]
    # Antenne
    d.rounded_rectangle(r(497, 190, 527, 300), radius=round(15 * s), fill=255)
    d.ellipse(r(470, 150, 554, 234), fill=255)
    # Ohren
    d.rounded_rectangle(r(205, 430, 265, 610), radius=round(30 * s), fill=255)
    d.rounded_rectangle(r(759, 430, 819, 610), radius=round(30 * s), fill=255)
    # Kopf
    d.rounded_rectangle(r(255, 290, 769, 760), radius=round(150 * s), fill=255)
    # Gesicht (Visier) ausstanzen
    d.rounded_rectangle(r(320, 400, 704, 640), radius=round(110 * s), fill=0)
    # Augen und Lächeln wieder hinein
    d.ellipse(r(400, 470, 470, 540), fill=255)
    d.ellipse(r(554, 470, 624, 540), fill=255)
    d.arc(r(440, 500, 584, 600), start=30, end=150, fill=255, width=round(22 * s))
    return m


def icon(px=1024, ss=4):
    size = px * ss
    img = Image.new("RGB", (size, size), BG)
    # weicher Schimmer hinter dem Kopf
    glow = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glow).ellipse([size * 0.16, size * 0.14, size * 0.84, size * 0.86], fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.09))
    img.paste(Image.new("RGB", (size, size), A1), (0, 0), glow)
    img.paste(gradient(size // 8).resize((size, size), Image.BILINEAR), (0, 0), bot_mask(size))
    return img.resize((px, px), Image.LANCZOS)


def splash(px=512, ss=4):
    size = px * ss
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = gradient(size // 8).resize((size, size), Image.BILINEAR).convert("RGBA")
    img.paste(grad, (0, 0), bot_mask(size))
    return img.resize((px, px), Image.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    icon().save(OUT / "icon.png", optimize=True)
    splash().save(OUT / "splash-icon.png", optimize=True)
    print("ok:", OUT / "icon.png", OUT / "splash-icon.png")
