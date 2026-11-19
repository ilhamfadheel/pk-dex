"""Cut every unit's battle sprite frames out of the game's own sheets and read its animations
from the game program. Writes public/img/anim/<slug>.png and src/data/anims.json.

Usage: python scripts/extract-sprites.py <path to system/apps/6rah>

Sheets: pokekin.mbm bitmap 258 + 2*unitId is the unit's 12-bit sprite sheet, the next bitmap
its 1-bit mask (0 = part of the unit). The lower half holds the frames facing right, laid
out as the frame table says; the upper half is that half mirrored left to right. The strips
are cut from the upper half, so every sprite faces left like the portraits.

Frames and animations (6rah.app, ARM code at file offset 0x7C, VA base 0x10000000):
- 0x10021170 switches on the unit id (jump table at 0x10021178, 115 entries); each case loads
  the address of that race's set-up routine (49 routines).
- A routine passes its frame table to 0x1006ac2c: records of six int32 (x, y, w, h, ox, oy),
  the rectangle in the lower half of the sheet and where its top-left corner sits relative
  to the unit's feet.
- Animation scripts follow the frame table: (frame, ticks) int32 pairs ending with -1 (loop)
  or -2 (play once). The routine passes them to 0x1006ac04; the script given to 0x100224d8 is
  the standing loop and the one in r3 of 0x10022538 is the walk.
- The scripts a routine uses after those two are its attack and then its special move. A
  two-frame play-once script that no routine starts is the guard and flinch when hit; races
  without one have a pair of frames no script uses in the same place on the sheet.

Each strip is one row of equal cells with the unit's feet at (ax, ay) in every cell.
"""
import json
import os
import re
import struct
import sys
from functools import reduce
from math import gcd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mbm import pixels, png, read_all, stride  # noqa: E402

BASE, CODE_AT = 0x10000000, 0x7C
JUMP_TABLE, UNITS = 0x10021178, 115
SET_FRAMES, SET_ANIM, SET_IDLE, SET_WALK = 0x1006AC2C, 0x1006AC04, 0x100224D8, 0x10022538
FIRST_SHEET = 258

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
units = json.load(open(os.path.join(root, "src", "data", "units.json"), encoding="utf-8"))
assert len(units) == UNITS
slug = lambda s: re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", re.sub(r"['’]", "", s.lower())))

app = open(os.path.join(game, "6rah.app"), "rb").read()
word = lambda va: struct.unpack_from("<I", app, va - BASE + CODE_AT)[0]
ints = lambda va, n: struct.unpack_from("<%di" % n, app, va - BASE + CODE_AT)


def literal(va):
    """(register, value) when the instruction at va is `ldr rN, [pc, #imm]`."""
    w = word(va)
    if w & 0xFFFF0000 == 0xE59F0000:
        return w >> 12 & 15, word(va + 8 + (w & 0xFFF))
    return None


def branch(va, link):
    w = word(va)
    if w >> 24 == (0xEB if link else 0xEA):
        off = w & 0xFFFFFF
        return (va + 8 + ((off - (1 << 24) if off & 0x800000 else off) << 2)) & 0xFFFFFFFF
    return None


def routine_of(unit):
    va = word(JUMP_TABLE + 4 * unit)
    for _ in range(40):
        lit = literal(va)
        if lit:
            return lit[1]
        va = branch(va, False) or va + 4
    raise AssertionError(f"no set-up routine for unit {unit}")


def calls(fn):
    """callee -> list of {register: literal loaded in the five instructions before the call}."""
    out = {}
    va = fn + 4
    while word(va) >> 16 != 0xE92D:  # until the next function's push
        callee = branch(va, True)
        if callee in (SET_FRAMES, SET_ANIM, SET_IDLE, SET_WALK):
            regs = {}
            for k in range(va - 20, va, 4):
                lit = literal(k)
                if lit:
                    regs[lit[0]] = lit[1]
            out.setdefault(callee, []).append(regs)
        va += 4
    return out


def script(va):
    seq = []
    while True:
        f, t = ints(va, 2)
        va += 8
        if f in (-1, -2, 0xFFFF, 0xFFFE):
            return seq, f in (-1, 0xFFFF), va
        assert 0 <= f < 64 and 0 < t < 64, f"bad animation step at {va - 8:#x}"
        seq.append((f, t))


def expand(seq):
    """Frame list with each frame repeated for its share of ticks."""
    g = reduce(gcd, (t for _, t in seq))
    return [f for f, t in seq for _ in range(t // g)]


def race(fn):
    c = calls(fn)
    table = c[SET_FRAMES][-1][1]
    idle = c[SET_IDLE][-1][1]
    walk = c[SET_WALK][-1][3]
    used = [r[1] for r in c[SET_ANIM] if 1 in r and r[1] != table]
    first = min(used + [idle, walk])
    assert first > table and (first - table) % 24 == 0, f"frame table {table:#x}"
    frames = [ints(table + 24 * k, 6) for k in range((first - table) // 24)]
    scripts, va = {}, first
    while va <= max(used + [idle, walk]):
        seq, loop, nxt = script(va)
        scripts[va] = (seq, loop)
        va = nxt
    # a trailing play-once pair nobody starts: the flinch
    try:
        seq, loop, _ = script(va)
        if not loop and len(seq) == 2:
            scripts[va] = (seq, loop)
    except AssertionError:
        pass
    for seq, _ in scripts.values():
        assert all(f < len(frames) for f, _ in seq)

    order = sorted(scripts)
    moves = []
    for k, a in enumerate(order):
        seq = [f for f, _ in scripts[a][0]]
        nxt = [f for f, _ in scripts[order[k + 1]][0]] if k + 1 < len(order) else []
        if a in used and a not in (idle, walk) and len(seq) >= 3 and nxt[: len(seq)] != seq:
            moves.append(a)
    anims = {"idle": expand(scripts[idle][0])}
    if walk != idle:
        anims["walk"] = expand(scripts[walk][0])
    if not moves and walk != idle and not scripts[walk][1]:
        moves = [walk]  # the hop is also the attack
    if moves:
        anims["attack"] = expand(scripts[moves[0]][0])
    if len(moves) > 1:
        anims["skill"] = expand(scripts[moves[1]][0])
    flinch = [a for a in order if a not in used and a not in (idle, walk) and not scripts[a][1] and len(scripts[a][0]) == 2]
    spare = [k for k in range(len(frames)) if not any(k == f for seq, _ in scripts.values() for f, _ in seq)]
    if flinch:
        anims["defend"] = expand(scripts[flinch[0]][0])
    elif spare:
        anims["defend"] = [k for k in spare[:2] if k - spare[0] < 2]  # frames the code shows directly
    return frames, anims


sheets = read_all(os.path.join(game, "pokekin.mbm"))
out_dir = os.path.join(root, "public", "img", "anim")
os.makedirs(out_dir, exist_ok=True)
races, result = {}, {}
for u in units:
    fn = routine_of(u["id"])
    if fn not in races:
        races[fn] = race(fn)
    frames, anims = races[fn]
    col, mask = sheets[FIRST_SHEET + 2 * u["id"]], sheets[FIRST_SHEET + 2 * u["id"] + 1]
    W, H = col["w"], col["h"]
    assert col["bpp"] == 12 and mask["bpp"] == 1 and (mask["w"], mask["h"]) == (W, H), f"sheet of unit {u['id']}"
    assert all(x + w <= W and y + h <= H // 2 for x, y, w, h, _, _ in frames), f"frames outside the sheet of unit {u['id']}"
    d, s = pixels(col), stride(W, 12)
    m, ms = pixels(mask), stride(W, 1)

    # the same frame in the mirrored upper half: x and the feet offset flip
    frames = [(W - x - w, y, w, h, -(ox + w), oy) for x, y, w, h, ox, oy in frames]
    left, top = min(f[4] for f in frames), min(f[5] for f in frames)
    cw = max(f[4] + f[2] for f in frames) - left
    ch = max(f[5] + f[3] for f in frames) - top
    strip = [bytearray(4 * cw * len(frames)) for _ in range(ch)]
    for k, (x, y, w, h, ox, oy) in enumerate(frames):
        for j in range(h):
            row = strip[oy - top + j]
            for i in range(w):
                sx, sy = x + i, y + j
                if (m[sy * ms + sx // 8] >> (sx % 8)) & 1:
                    continue
                v = d[sy * s + 2 * sx] | d[sy * s + 2 * sx + 1] << 8
                at = 4 * (k * cw + ox - left + i)
                row[at:at + 4] = bytes(((v >> 8 & 15) * 17, (v >> 4 & 15) * 17, (v & 15) * 17, 255))
    name = slug(u["name"])
    png(os.path.join(out_dir, f"{name}.png"), cw * len(frames), ch, [bytes(r) for r in strip])
    result[name] = {"cw": cw, "ch": ch, "n": len(frames), "ax": -left, "ay": -top, "anims": anims}

with open(os.path.join(root, "src", "data", "anims.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, separators=(",", ":"))
    f.write("\n")
print(f"wrote {len(result)} sprite strips ({len(races)} races) to public/img/anim/ and src/data/anims.json")
