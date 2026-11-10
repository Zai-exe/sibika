"""Builds og-image.png, the picture Facebook and Messenger show when the site is shared.
Run from the repo root: python scripts/make-og-image.py"""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
NAVY, BLUE, SUN, WHITE, MUTED = (11, 29, 74), (0, 56, 168), (242, 183, 5), (255, 255, 255), (185, 196, 224)

img = Image.new("RGBA", (W, H), NAVY + (255,))

# Sun rays in the top-right corner, drawn on a see-through layer so they blend into the navy
rays = Image.new("RGBA", (W, H), (0, 0, 0, 0))
r = ImageDraw.Draw(rays)
cx, cy = 1090, 90
for i in range(16):
    a = math.radians(i * 22.5)
    p = lambda rad, da: (cx + rad * math.cos(a + da), cy + rad * math.sin(a + da))
    r.polygon([p(115, -0.08), p(115, 0.08), p(400, 0.025), p(400, -0.025)], fill=(32, 66, 150, 255))
r.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=SUN + (255,))
img = Image.alpha_composite(img, rays)
d = ImageDraw.Draw(img)


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


bold = ["C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Arial Bold.ttf"]
regular = ["C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "Arial.ttf"]

# Logo mark
d.rounded_rectangle([80, 80, 152, 152], radius=20, fill=BLUE)
d.ellipse([104, 104, 128, 128], fill=SUN)
for i in range(8):
    a = math.radians(i * 45)
    x1, y1 = 116 + 18 * math.cos(a), 116 + 18 * math.sin(a)
    x2, y2 = 116 + 28 * math.cos(a), 116 + 28 * math.sin(a)
    d.line([x1, y1, x2, y2], fill=SUN, width=5)
d.text((172, 88), "Sibika", font=font(bold, 46), fill=WHITE)
d.text((174, 140), "Civic tech & CSO directory", font=font(regular, 24), fill=MUTED)

title = font(bold, 76)
d.text((80, 230), "Every civic project in the", font=title, fill=WHITE)
d.text((80, 318), "Philippines, in one place.", font=title, fill=WHITE)
tw = d.textlength("in one place.", font=title)
x0 = 80 + d.textlength("Philippines, ", font=title)
d.rectangle([x0, 418, x0 - 12 + tw, 428], fill=SUN)

d.text((80, 470), "Civic tech tools and civil society organizations across 15 sectors.", font=font(regular, 30), fill=MUTED)
d.text((80, 540), "zai-exe.github.io/sibika", font=font(bold, 28), fill=SUN)

img.convert("RGB").save("og-image.png", optimize=True)
print("wrote og-image.png")
