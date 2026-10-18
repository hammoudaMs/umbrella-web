from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "public" / "landing" / "tunisia-map.png"
backup = ROOT / "public" / "landing" / "tunisia-map.with-hubs.png"

if not backup.exists():
    backup.write_bytes(src.read_bytes())

orig = np.array(Image.open(backup).convert("RGBA"), dtype=np.uint8)
r = orig[:, :, 0].astype(np.int16)
g = orig[:, :, 1].astype(np.int16)
b = orig[:, :, 2].astype(np.int16)

white = (r > 175) & (g > 175) & (b > 175)
glow = (
    (r > 90)
    & (g > 55)
    & (b > 55)
    & ((r + g + b) > 240)
    & (g > r * 0.35)
    & (b > r * 0.3)
)
pale = (r > 140) & (g > 140) & (b > 140) & ((r + g + b) > 420)
hub = white | glow | pale
for dy in range(-10, 11):
    for dx in range(-10, 11):
        if dx * dx + dy * dy > 100:
            continue
        hub |= np.roll(np.roll(white | pale, dy, axis=0), dx, axis=1)

# Include red under/around hubs: any reddish speck, even if washed by glow
reddish = (r > 60) & (r > g + 15) & (r > b + 15) & (g < 100) & (b < 100)
# Silhouette = reddish OR (was hub but inside country via close)
sil = reddish | hub
# Morphological close: dilate then erode to fill hub holes
for _ in range(2):
    dil = sil.copy()
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            if dx * dx + dy * dy > 16:
                continue
            dil |= np.roll(np.roll(sil, dy, axis=0), dx, axis=1)
    sil = dil
for _ in range(2):
    ero = sil.copy()
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            if dx * dx + dy * dy > 16:
                continue
            ero &= np.roll(np.roll(sil, dy, axis=0), dx, axis=1)
    sil = ero

# Trim pure hub glow that spilled outside coastline: keep only pixels near reddish
near = reddish.copy()
for dy in range(-6, 7):
    for dx in range(-6, 7):
        if dx * dx + dy * dy > 36:
            continue
        near |= np.roll(np.roll(reddish, dy, axis=0), dx, axis=1)
sil &= near | reddish

h, w = sil.shape
ry, rx = np.where(reddish & ~hub)
step = 5
phase_x = int(np.bincount(rx % step).argmax()) if len(rx) else 2
phase_y = int(np.bincount(ry % step).argmax()) if len(ry) else 2
color = (
    np.median(
        orig[ry[:: max(1, len(ry) // 400)], rx[:: max(1, len(rx) // 400)], :3],
        axis=0,
    )
    if len(rx)
    else np.array([153, 18, 17])
).astype(np.uint8)

out = np.zeros_like(orig)
out[:, :, 3] = 255
dots = 0
for y in range(phase_y, h, step):
    for x in range(phase_x, w, step):
        if not sil[y, x]:
            continue
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                if dx * dx + dy * dy > 2:
                    continue
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w:
                    out[yy, xx, 0] = int(color[0])
                    out[yy, xx, 1] = int(color[1])
                    out[yy, xx, 2] = int(color[2])
        dots += 1

Image.fromarray(out, "RGBA").save(src, optimize=True)
print(f"clean map: dots={dots} white_left=0 -> {src.name}")
