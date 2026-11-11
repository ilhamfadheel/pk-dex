"""Extract each city's shop stock (units + items) from the game's own data files.

Usage: python scripts/extract-shops.py <path to system/apps/6rah>
Writes src/data/shops.json.

Formats (all tables start with a 16-byte header whose first u32 is the count):
  unitshop.dat  42 x 8 bytes : up to 5 unit ids (0xFF = empty), count, 2 pad
  itemshop.dat  42 x 16 bytes: (category, index) pairs, then (5, 0) = item count 5
  item0..4.dat / equip0..2.dat: 48-byte records, name in the first 32 bytes
      category 0 molds, 1 ores, 2 jewels, 3 other materials, 4 emblems,
               5 weapons, 6 armor, 7 accessories
  english/area.dat 42 x 240 bytes: up to 5 dungeon names (UTF-16, 48 bytes each)
Shop record i belongs to area i; the city name comes from matching that area's
dungeon names against the material data (each dungeon lists its city).
"""
import json, os, sys

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def table(name):
    b = open(os.path.join(game, name), "rb").read()
    n = int.from_bytes(b[0:4], "little")
    return [b[16 + i * 48:16 + i * 48 + 32].split(b"\0")[0].decode("latin1") for i in range(n)]


CATS = {0: ("Molds", table("item0.dat")), 1: ("Ores", table("item1.dat")), 2: ("Jewels", table("item2.dat")),
        3: ("Other Materials", table("item3.dat")), 4: ("Emblems", table("item4.dat")),
        5: ("Weapons", table("equip0.dat")), 6: ("Armor", table("equip1.dat")), 7: ("Accessories", table("equip2.dat"))}
# The mold table calls the RankUp mold "Symbol"; the game's English text calls it RankUp.
MOLD_NAMES = {"Symbol": "RankUp Mold"}

units = json.load(open(os.path.join(root, "src", "data", "units.json"), encoding="utf-8"))
unit_name = {u["id"]: u["name"] for u in units}

# dungeon -> city from the material data
materials = json.load(open(os.path.join(root, "src", "data", "materials.json"), encoding="utf-8"))
dungeon_city = {}
for m in materials:
    for d in m["dungeon_reward"]:
        dungeon_city[d["dungeon"]] = d["area"]

ab = open(os.path.join(game, "english", "area.dat"), "rb").read()
areas = []
for i in range(len(ab) // 240):
    rec = ab[i * 240:(i + 1) * 240]
    names = []
    for j in range(5):
        s = rec[j * 48:(j + 1) * 48].decode("utf-16-le", errors="replace").split("\x1b")[0].split("\x00")[0].strip()
        if s:
            names.append(s)
    areas.append(names)

ib = open(os.path.join(game, "itemshop.dat"), "rb").read()
ub = open(os.path.join(game, "unitshop.dat"), "rb").read()
n = int.from_bytes(ib[0:4], "little")
assert n == int.from_bytes(ub[0:4], "little") == len(areas), "table sizes differ"

out, problems = [], []
for i in range(n):
    cities = {dungeon_city[d] for d in areas[i] if d in dungeon_city}
    if len(cities) != 1:
        problems.append(f"area {i} {areas[i]} -> {sorted(cities)}")
        continue
    city = cities.pop()

    r = ib[16 + i * 16:16 + (i + 1) * 16]
    pairs = [(r[k], r[k + 1]) for k in range(0, 16, 2)]
    count = next((x for c, x in pairs if c == 5), None)  # the (5, n) pair is the item count
    stock = pairs[: pairs.index((5, count))] if count is not None else []
    items = []
    for c, x in stock:
        cat, names = CATS[c]
        name = names[x]
        if c == 0:
            name = MOLD_NAMES.get(name, f"{name} Mold")
        items.append({"category": cat, "name": name})

    u = ub[16 + i * 8:16 + (i + 1) * 8]
    ids = [b for b in u[:5] if b != 0xFF]
    assert len(ids) == u[5], f"unit count mismatch in record {i}"
    out.append({"index": i, "city": city, "dungeons": areas[i], "units": [unit_name[x] for x in ids], "items": items})

if problems:
    print("could not name:", *problems, sep="\n  ")
    sys.exit(1)
assert len({s["city"] for s in out}) == len(out), "two records map to the same city"
json.dump(out, open(os.path.join(root, "src", "data", "shops.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"wrote {len(out)} shops")
for s in out[:4] + out[-2:]:
    print(f"  {s['city']}: units {', '.join(s['units'])} | items {', '.join(x['name'] for x in s['items'])}")
