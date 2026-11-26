"""Polished SYNTHETIC app screens for the README showcase (fictional app "Habitly").
Drawn at 3x and downsampled for smooth edges. Output: /home/claude/qa/mock/*.png"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.environ.get("README_BUILD", ".readme-build"), "mock")
os.makedirs(OUT, exist_ok=True)
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
S = 2  # supersampling


def font(size, bold=False):
    return ImageFont.truetype(FB if bold else F, int(size * S))


def canvas(w, h, bg):
    im = Image.new("RGB", (w * S, h * S), bg)
    return im, ImageDraw.Draw(im)


def done(im, w, h, name):
    im.resize((w, h), Image.LANCZOS).save(f"{OUT}/{name}.png", optimize=True)


def rr(d, box, r, fill=None, outline=None, width=0):
    d.rounded_rectangle([v * S for v in box], r * S, fill=fill, outline=outline, width=width * S)


def text(d, xy, s, size, fill, bold=False, anchor="la"):
    d.text((xy[0] * S, xy[1] * S), s, font=font(size, bold), fill=fill, anchor=anchor)


def ring(d, cx, cy, r, w, pct, col, track):
    box = [(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S]
    d.arc(box, 0, 360, fill=track, width=w * S)
    d.arc(box, -90, -90 + 360 * pct, fill=col, width=w * S)


def status(d, dark=False):
    c = (255, 255, 255) if dark else (17, 24, 39)
    text(d, (70, 52), "9:41", 40, c, True)
    rr(d, (1030, 58, 1120, 92), 10, outline=c, width=3)
    rr(d, (1036, 64, 1100, 86), 6, fill=c)


W, H = 1206, 2622
INDIGO, PINK, TEAL, AMBER = (99, 102, 241), (236, 72, 153), (20, 184, 166), (245, 158, 11)
INK, MUTED, BG = (17, 24, 39), (107, 114, 128), (246, 247, 251)

# 1. Today — progress ring + habit list
im, d = canvas(W, H, BG)
status(d)
text(d, (70, 170), "Thursday, 26 Nov", 40, MUTED)
text(d, (70, 220), "Today", 96, INK, True)
rr(d, (60, 380, W - 60, 1000), 56, fill=(255, 255, 255))
ring(d, W // 2, 690, 230, 46, 0.72, INDIGO, (229, 231, 255))
text(d, (W // 2, 660), "72%", 110, INK, True, "mm")
text(d, (W // 2, 760), "5 of 7 habits", 40, MUTED, False, "mm")
habits = [("Morning run", "5 km", TEAL, True), ("Read 20 pages", "Day 21", AMBER, True), ("Drink water", "6 / 8 glasses", (59, 130, 246), False), ("Meditate", "10 min", PINK, True), ("No sugar", "Day 4", INDIGO, False)]
y = 1060
for name, sub, col, ok in habits:
    rr(d, (60, y, W - 60, y + 230), 44, fill=(255, 255, 255))
    d.ellipse([(110) * S, (y + 55) * S, (230) * S, (y + 175) * S], fill=col + (255,))
    text(d, (270, y + 70), name, 50, INK, True)
    text(d, (270, y + 140), sub, 38, MUTED)
    cx = W - 150
    if ok:
        d.ellipse([(cx - 50) * S, (y + 65) * S, (cx + 50) * S, (y + 165) * S], fill=col)
        d.line([((cx - 22) * S, (y + 115) * S), ((cx - 4) * S, (y + 135) * S), ((cx + 26) * S, (y + 95) * S)], fill="white", width=12 * S, joint="curve")
    else:
        d.ellipse([(cx - 50) * S, (y + 65) * S, (cx + 50) * S, (y + 165) * S], outline=(209, 213, 219), width=8 * S)
    y += 260
rr(d, (W // 2 - 200, H - 50, W // 2 + 200, H - 36), 7, fill=INK)
done(im, W, H, "today")

# 2. Stats — streak tiles + bar chart
im, d = canvas(W, H, BG)
status(d)
text(d, (70, 220), "Streaks", 96, INK, True)
for i, (big, small, col) in enumerate([("21", "day streak", INDIGO), ("86%", "this month", TEAL)]):
    x0 = 60 + i * 553
    rr(d, (x0, 380, x0 + 523, 700), 48, fill=col)
    text(d, (x0 + 50, 440), big, 120, (255, 255, 255), True)
    text(d, (x0 + 50, 610), small, 42, (255, 255, 255))
rr(d, (60, 740, W - 60, 1540), 48, fill=(255, 255, 255))
text(d, (110, 800), "Last 7 days", 46, INK, True)
vals = [0.55, 0.8, 0.65, 0.95, 0.7, 1.0, 0.85]
for i, v in enumerate(vals):
    x = 140 + i * 140
    top = 1430 - int(500 * v)
    rr(d, (x, top, x + 80, 1430), 26, fill=PINK if i == 5 else (251, 207, 232))
    text(d, (x + 40, 1490), "MTWTFSS"[i], 36, MUTED, False, "mm")
rr(d, (60, 1580, W - 60, 2380), 48, fill=(255, 255, 255))
text(d, (110, 1640), "Best habits", 46, INK, True)
for i, (n, pct, col) in enumerate([("Morning run", 0.92, TEAL), ("Read", 0.81, AMBER), ("Meditate", 0.67, PINK), ("Water", 0.54, (59, 130, 246))]):
    yy = 1760 + i * 150
    text(d, (110, yy), n, 42, INK)
    rr(d, (110, yy + 60, W - 110, yy + 90), 15, fill=(243, 244, 246))
    rr(d, (110, yy + 60, 110 + int((W - 220) * pct), yy + 90), 15, fill=col)
rr(d, (W // 2 - 200, H - 50, W // 2 + 200, H - 36), 7, fill=INK)
done(im, W, H, "stats")

# 3. Plan — week calendar
im, d = canvas(W, H, BG)
status(d)
text(d, (70, 220), "Plan", 96, INK, True)
rr(d, (60, 380, W - 60, 760), 48, fill=(255, 255, 255))
for i in range(7):
    x = 120 + i * 145
    sel = i == 3
    if sel:
        rr(d, (x - 40, 430, x + 60, 700), 40, fill=INDIGO)
    text(d, (x + 10, 490), "MTWTFSS"[i], 38, (255, 255, 255) if sel else MUTED, False, "mm")
    text(d, (x + 10, 580), str(23 + i if 23 + i <= 30 else i - 7), 50, (255, 255, 255) if sel else INK, True, "mm")
    for k in range(min(3, (i * 5) % 4 + 1)):
        d.ellipse([(x - 8 + k * 22) * S, (650) * S, (x + 6 + k * 22) * S, (664) * S], fill=[TEAL, AMBER, PINK][k] if not sel else (255, 255, 255))
items = [("07:00", "Morning run", TEAL), ("08:30", "Read 20 pages", AMBER), ("13:00", "Walk after lunch", (59, 130, 246)), ("21:30", "Meditate", PINK), ("22:00", "Plan tomorrow", INDIGO)]
y = 820
for t, n, col in items:
    rr(d, (60, y, W - 60, y + 220), 44, fill=(255, 255, 255))
    rr(d, (60, y, 90, y + 220), 14, fill=col)
    text(d, (140, y + 60), t, 40, MUTED)
    text(d, (140, y + 120), n, 52, INK, True)
    y += 250
rr(d, (W // 2 - 200, H - 50, W // 2 + 200, H - 36), 7, fill=INK)
done(im, W, H, "plan")

# 4. Focus — dark timer
im, d = canvas(W, H, (11, 12, 26))
status(d, True)
text(d, (W // 2, 330), "Focus", 64, (255, 255, 255), True, "mm")
ring(d, W // 2, 1150, 420, 40, 0.62, (167, 139, 250), (39, 39, 70))
text(d, (W // 2, 1110), "24:59", 190, (255, 255, 255), True, "mm")
text(d, (W // 2, 1290), "Deep work", 48, (167, 139, 250), False, "mm")
d.ellipse([(W // 2 - 130) * S, 1850 * S, (W // 2 + 130) * S, 2110 * S], fill=(167, 139, 250))
d.polygon([((W // 2 - 35) * S, 1920 * S), ((W // 2 - 35) * S, 2040 * S), ((W // 2 + 60) * S, 1980 * S)], fill=(11, 12, 26))
rr(d, (W // 2 - 200, H - 50, W // 2 + 200, H - 36), 7, fill=(255, 255, 255))
done(im, W, H, "focus")

# 5. Watch (422x514) and Wear OS (1080x1080)
for name, (w, h), r in [("watch", (422, 514), 150), ("wear", (1080, 1080), 380)]:
    im, d = canvas(w, h, (0, 0, 0))
    ring(d, w // 2, h // 2, r, max(14, r // 9), 0.72, INDIGO, (40, 40, 70))
    ring(d, w // 2, h // 2, int(r * 0.74), max(14, r // 9), 0.55, TEAL, (20, 50, 50))
    text(d, (w // 2, h // 2 - r * 0.06), "72%", int(r * 0.42), (255, 255, 255), True, "mm")
    text(d, (w // 2, h // 2 + r * 0.3), "5 of 7", int(r * 0.15), (156, 163, 175), False, "mm")
    done(im, w, h, name)

# 6. Icon
im, d = canvas(512, 512, INDIGO)
ring(d, 256, 256, 150, 46, 0.75, (255, 255, 255), (129, 140, 248))
done(im, 512, 512, "icon")
print("mock screens:", sorted(os.listdir(OUT)))
