"""Extract equipment stats and each area's enemy parties from the game's data files.

Usage: python scripts/extract-gear-enemies.py <path to system/apps/6rah>
Writes src/data/equipment.json, src/data/enemies.json and src/data/unit-prices.json.

equip0/1/2.dat (weapons, armor, accessories): 16-byte header (u32 count), then
  48-byte records: name (32 bytes, latin-1) + data:
    weapons/armor: tier (u8), ATK/DEF bonus (u8), value (u16 big-endian, = 100 x tier)
    accessories:   tier (u8), low byte of value (value = 100 x tier)
  Order: 56 base weapons (7 ores x 8 molds), then 56 named weapons in the crafting
  chart's order (7 per mold); 7 base armors then 7 named; 5 base accessories then 7 named.

partydata.dat: u16 big-endian count (378 = 42 areas x 9 parties) in a 16-byte header,
  then 32-byte party records; unit ids (0xFF = empty) at bytes 3, 10, 17 and 24.
  Party p of area a is record a*9 + p (areas in english/move.dat order).
  So a party holds at most 4 units.

unit.dat: 115 x 160-byte records, no header, in unit-id order: name (UTF-16, 48 bytes),
  race name, ..., then at byte 144: race, rank, 0, size, HP ATK DEF AGI DEX WIS INT HIT
  (u8 each), shop price in gold (u16 big-endian, byte 156).
"""
import json, os, re, sys

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load = lambda name: json.load(open(os.path.join(root, "src", "data", name), encoding="utf-8"))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

MOLDS = ["Sword", "Spear", "Axe", "Claw", "Blade", "Bow", "Staff", "Mace"]
ORES = ["Copper", "Chrome", "Silver", "Gold", "Platinum", "Mythril", "Orihalcon"]
# crafted names as the site shows them (typos fixed there); match by normalised name
NAME_FIX = {"Fairy Cloack": "Fairy Cloak", "ForestMace": "Forest Mace", "NinjaBlade": "Ninja Blade",
            "Shinning Mace": "Shining Mace", "Shinning Robe": "Shining Robe", "Goliat Sling": "Goliath Sling",
            "Judgement Blade": "Judgment Blade"}  # all as the game's own item tables spell them
crafting = load("crafting.json")
crafted = {norm(c["result"]): NAME_FIX.get(c["result"], c["result"]) for c in crafting}


def records(name):
    b = open(os.path.join(game, name), "rb").read()
    n = int.from_bytes(b[0:4], "little")
    assert len(b) == 16 + n * 48, f"{name}: size mismatch"
    return [(b[16 + i * 48:16 + i * 48 + 32].split(b"\0")[0].decode("latin1"), b[16 + i * 48 + 32:16 + (i + 1) * 48]) for i in range(n)]


def clean(name):
    if norm(name) in crafted:
        return crafted[norm(name)]
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name)  # "PlatinumBracelet" -> "Platinum Bracelet"


gear = []
weapons, armor, acc = records("equip0.dat"), records("equip1.dat"), records("equip2.dat")
assert (len(weapons), len(armor), len(acc)) == (112, 14, 12), "unexpected equipment counts"
for i, (name, d) in enumerate(weapons):
    mold = name.split()[-1] if i < 56 else MOLDS[(i - 56) // 7]
    assert i >= 56 or (name.split()[0] == ORES[i // 8] and mold == MOLDS[i % 8]), f"base weapon order broken at {i}"
    gear.append({"name": clean(name), "category": "Weapons", "type": mold, "tier": d[0], "atk": d[1], "def": 0,
                 "value": int.from_bytes(d[2:4], "big"), "crafted": i >= 56, "ore": ORES[i // 8] if i < 56 else None})
for i, (name, d) in enumerate(armor):
    gear.append({"name": clean(name), "category": "Armor", "type": "Armor", "tier": d[0], "atk": 0, "def": d[1],
                 "value": int.from_bytes(d[2:4], "big"), "crafted": i >= 7, "ore": ORES[i] if i < 7 else None})
for i, (name, d) in enumerate(acc):
    gear.append({"name": clean(name), "category": "Accessories", "type": "Accessory", "tier": d[0], "atk": 0, "def": 0,
                 "value": d[0] * 100, "crafted": i >= 5, "ore": ["Silver", "Gold", "Platinum", "Mythril", "Orihalcon"][i] if i < 5 else None})
for g in gear:
    assert 1 <= g["tier"] <= 10 and g["value"] == g["tier"] * 100, f"odd record {g}"
named = {norm(g["name"]) for g in gear if g["crafted"]}
missing = [c["result"] for c in crafting if norm(NAME_FIX.get(c["result"], c["result"])) not in named]
assert not missing, f"crafted items not found in equipment tables: {missing}"

# ---- enemies ----
units = {u["id"]: u["name"] for u in load("units.json")}
move = open(os.path.join(game, "english", "move.dat"), "rb").read()
areas = [move[i * 48:(i + 1) * 48].decode("utf-16-le").split("\x1b")[0] for i in range(42)]
pb = open(os.path.join(game, "partydata.dat"), "rb").read()
count = int.from_bytes(pb[0:2], "big")
assert count == 42 * 9 and len(pb) == 16 + count * 32, "unexpected partydata layout"
enemies = []
for a, city in enumerate(areas):
    parties = []
    for p in range(9):
        r = pb[16 + (a * 9 + p) * 32:16 + (a * 9 + p + 1) * 32]
        ids = [r[o] for o in (3, 10, 17, 24) if r[o] != 0xFF]
        assert all(x in units for x in ids), f"unknown unit id in {city} party {p}"
        parties.append([units[x] for x in ids])
    enemies.append({"city": city, "parties": parties})

json.dump(gear, open(os.path.join(root, "src", "data", "equipment.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(enemies, open(os.path.join(root, "src", "data", "enemies.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
ub = open(os.path.join(game, "unit.dat"), "rb").read()
unit_list = load("units.json")
assert len(ub) == 160 * len(unit_list), "unexpected unit.dat size"
prices = {}
for u in unit_list:
    r = ub[u["id"] * 160:(u["id"] + 1) * 160]
    name = r[:48].decode("utf-16-le").split("")[0]
    assert norm(name) == norm(u["name"]), f"unit.dat order differs at {u['id']}: {name} / {u['name']}"
    prices[u["name"]] = int.from_bytes(r[156:158], "big")
json.dump(prices, open(os.path.join(root, "src", "data", "unit-prices.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"wrote {len(gear)} equipment items, {len(enemies)} areas x 9 enemy parties")
