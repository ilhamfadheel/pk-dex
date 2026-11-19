"""Export every unit's portrait from the game's pokeport.mbm to public/img/portrait/<slug>.png.

Usage: python scripts/extract-portraits.py <path to system/apps/6rah>

pokeport.mbm holds 115 pairs of bitmaps in unit-id order: a 104 x 50 colour bitmap whose
left 48 x 50 pixels are the portrait (the rest is four small face icons), followed by its
1-bit mask (0 = part of the unit).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mbm import pixels, png, read_all, stride  # noqa: E402

W, H = 48, 50
game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
units = json.load(open(os.path.join(root, "src", "data", "units.json"), encoding="utf-8"))
slug = lambda s: re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", re.sub(r"['’]", "", s.lower())))
out = os.path.join(root, "public", "img", "portrait")
os.makedirs(out, exist_ok=True)

bms = read_all(os.path.join(game, "pokeport.mbm"))
assert len(bms) == 2 * len(units), f"expected {2 * len(units)} bitmaps, found {len(bms)}"
for u in units:
    col, mask = bms[2 * u["id"]], bms[2 * u["id"] + 1]
    assert (col["w"], col["h"], col["bpp"]) == (104, 50, 12) and mask["bpp"] == 1, f"unexpected bitmap for unit {u['id']}"
    d, s = pixels(col), stride(104, 12)
    m, ms = pixels(mask), stride(104, 1)
    rows = []
    for y in range(H):
        r = bytearray()
        for x in range(W):
            v = d[y * s + 2 * x] | d[y * s + 2 * x + 1] << 8
            opaque = not (m[y * ms + x // 8] >> (x % 8)) & 1
            r += bytes(((v >> 8 & 15) * 17, (v >> 4 & 15) * 17, (v & 15) * 17, 255 if opaque else 0))
        rows.append(bytes(r))
    png(os.path.join(out, f"{slug(u['name'])}.png"), W, H, rows)
print(f"wrote {len(units)} portraits to public/img/portrait/")
