"""Draw the placeholder Elderglen launcher icon and splash into android/res.

Placeholder art (a sun over two hills in a glen) until the art direction work
replaces it. Run: python3 scripts/android/make_icons.py
"""
from PIL import Image, ImageDraw

RES = "android/app/src/main/res"
SKY, SUN = (27, 42, 31), (240, 205, 110)
HILL_FAR, HILL_NEAR = (62, 110, 70), (96, 150, 84)
S = 1024  # master size, 108dp adaptive canvas scaled up; safe zone is the middle 66%


def foreground() -> Image.Image:
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((560, 250, 760, 450), fill=SUN)
    d.ellipse((120, 560, 800, 1300), fill=HILL_FAR)
    d.ellipse((330, 650, 1000, 1350), fill=HILL_NEAR)
    return im


def full(fg: Image.Image) -> Image.Image:
    im = Image.new("RGBA", (S, S), SKY + (255,))
    im.alpha_composite(fg)
    return im


def round_mask(im: Image.Image) -> Image.Image:
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, im.size[0] - 1, im.size[1] - 1), fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, mask=mask)
    return out


fg = foreground()
square = full(fg)
# Legacy icons crop the middle of the canvas, like the adaptive mask does.
crop = square.crop((S // 2 - 340, S // 2 - 340, S // 2 + 340, S // 2 + 340))
density = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, k in density.items():
    legacy = round(48 * k)
    fgsize = round(108 * k)
    sq = crop.resize((legacy, legacy), Image.LANCZOS)
    sq.save(f"{RES}/mipmap-{name}/ic_launcher.png")
    round_mask(sq).save(f"{RES}/mipmap-{name}/ic_launcher_round.png")
    fg.resize((fgsize, fgsize), Image.LANCZOS).save(
        f"{RES}/mipmap-{name}/ic_launcher_foreground.png"
    )

# Splash: dark green with the icon in the middle, one size for every density.
for folder in [
    "drawable",
    *[f"drawable-{o}-{n}" for o in ("land", "port") for n in density if n != "mdpi" or o == "land"],
]:
    w, h = (1600, 960) if "land" in folder or folder == "drawable" else (960, 1600)
    sp = Image.new("RGBA", (w, h), SKY + (255,))
    icon = crop.resize((360, 360), Image.LANCZOS)
    sp.alpha_composite(icon, ((w - 360) // 2, (h - 360) // 2))
    try:
        sp.save(f"{RES}/{folder}/splash.png")
    except FileNotFoundError:
        pass
