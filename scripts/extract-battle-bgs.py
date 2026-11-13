"""Export the game's battle backdrops (352 x 124) from pokekin.mbm to public/img/battle/.

Usage: python scripts/extract-battle-bgs.py <path to system/apps/6rah>
They are bitmaps 134-144 of pokekin.mbm, in this order. Which one an area's battles use
follows its terrain (src/data/world.json); see TERRAIN_BG in src/lib/world.ts.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mbm import colour_rows, png, read_all  # noqa: E402

NAMES = ["town", "volcano", "ruins", "plains", "cave", "temple", "underwater", "beach", "swamp", "forest", "desert"]
FIRST = 134

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "public", "img", "battle")
os.makedirs(out, exist_ok=True)
bms = read_all(os.path.join(game, "pokekin.mbm"))
for i, name in enumerate(NAMES):
    bm = bms[FIRST + i]
    assert (bm["w"], bm["h"], bm["bpp"]) == (352, 124, 12), f"bitmap {FIRST + i} is not a battle backdrop"
    png(os.path.join(out, f"{name}.png"), 352, 124, colour_rows(bm))
print(f"wrote {len(NAMES)} battle backdrops to public/img/battle/")
