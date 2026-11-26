import json
import os
from PIL import Image, ImageDraw, ImageFont

IN = os.path.join(os.environ.get("README_BUILD", ".readme-build"), "shots")
OUT = "docs/images"
os.makedirs(OUT, exist_ok=True)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BG = (13, 17, 23)


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im, (0, 0), mask)
    return out


def save(im, name, width=None, jpeg=True):
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im = im.convert("RGB")
    path = f"{OUT}/{name}.{'jpg' if jpeg else 'png'}"
    im.save(path, quality=88, optimize=True, progressive=True) if jpeg else im.save(path, optimize=True)
    print(name, im.size, os.path.getsize(path) // 1024, "KB")


# Template gallery: 4 × 3 cells, each cell = 3 slides + name
templates = json.load(open(f"{IN}/templates.json"))
cw, gap, pad, label = 230, 10, 40, 64
cell_w = cw * 3 + gap * 2
sh = round(cw * 2868 / 1320)
cols, rows = 4, 3
W = pad * 2 + cols * cell_w + (cols - 1) * pad
H = pad * 2 + rows * (sh + label) + (rows - 1) * pad
grid = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(grid)
for n, t in enumerate(templates):
    cx = pad + (n % cols) * (cell_w + pad)
    cy = pad + (n // cols) * (sh + label + pad)
    for i in range(3):
        s = Image.open(f"{IN}/tpl-{t['id']}-{i}.png").convert("RGB").resize((cw, sh), Image.LANCZOS)
        grid.paste(rounded(s, 14), (cx + i * (cw + gap), cy), rounded(s, 14))
    d.text((cx, cy + sh + 16), t["name"], font=ImageFont.truetype(FB, 26), fill=(240, 242, 246))
    d.text((cx + cell_w, cy + sh + 20), t["id"], font=ImageFont.truetype(F, 20), fill=(139, 148, 165), anchor="ra")
save(grid, "templates", 2000)

# Showcase: 5 separate store images on a dark card
slides = [Image.open(f"{IN}/show-{i}.png").convert("RGB") for i in range(5)]
sw, shh = 360, round(360 * 2868 / 1320)
gap = 22
W = pad * 2 + 5 * sw + 4 * gap
show = Image.new("RGB", (W, shh + pad * 2), BG)
for i, s in enumerate(slides):
    s = rounded(s.resize((sw, shh), Image.LANCZOS), 22)
    show.paste(s, (pad + i * (sw + gap), pad), s)
save(show, "showcase", 2000)

# Seamless strip: the same deck as one connected canvas
strip = [Image.open(f"{IN}/strip-{i}.png").convert("RGB") for i in range(5)]
sw2, sh2 = strip[0].size
seam = Image.new("RGB", (sw2 * 5, sh2))
for i, s in enumerate(strip):
    seam.paste(s, (i * sw2, 0))
dd = ImageDraw.Draw(seam)
for i in range(1, 5):
    for y in range(0, sh2, 24):
        dd.line([(i * sw2, y), (i * sw2, y + 12)], fill=(255, 255, 255), width=2)
save(seam, "connected-canvas", 1800)

# Formats: phone, watch, Wear OS | feature graphic, event card
fm = {k: Image.open(f"{IN}/fmt-{k}.png").convert("RGB") for k in ["phone", "watch", "wear", "feature", "event"]}
H1 = 520
row1 = []
for k in ["phone", "watch", "wear"]:
    im = fm[k]
    row1.append((k, im.resize((round(im.width * H1 / im.height), H1), Image.LANCZOS)))
row2 = []
H2 = 330
for k in ["feature", "event"]:
    im = fm[k]
    row2.append((k, im.resize((round(im.width * H2 / im.height), H2), Image.LANCZOS)))
labels = {"phone": "Google Play phone · 1080×1920", "watch": "Apple Watch · 422×514", "wear": "Wear OS · 1:1, UI only", "feature": "Play feature graphic · 1024×500", "event": "In-App Event card · 16:9"}
w1 = sum(im.width for _, im in row1) + gap * 2
w2 = sum(im.width for _, im in row2) + gap
W = pad * 2 + max(w1, w2)
H = pad * 2 + H1 + 50 + pad + H2 + 50
sheet = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(sheet)
x = pad + (W - pad * 2 - w1) // 2
for k, im in row1:
    r = rounded(im, 26 if k != "wear" else im.width // 2)
    sheet.paste(r, (x, pad), r)
    d.text((x + im.width // 2, pad + H1 + 14), labels[k], font=ImageFont.truetype(F, 22), fill=(200, 205, 215), anchor="ma")
    x += im.width + gap
x = pad + (W - pad * 2 - w2) // 2
y2 = pad + H1 + 50 + pad
for k, im in row2:
    r = rounded(im, 16)
    sheet.paste(r, (x, y2), r)
    d.text((x + im.width // 2, y2 + H2 + 14), labels[k], font=ImageFont.truetype(F, 22), fill=(200, 205, 215), anchor="ma")
    x += im.width + gap
save(sheet, "formats", 1800)

# UI screenshots (PNG for crisp text)
for n in ["editor", "skill-dialog"]:
    im = Image.open(f"{IN}/{n}.png")
    save(im, n, 1800, jpeg=(n != "skill-dialog"))
