"""Extract the townsfolk quest reward pools (where quest emblems come from).

Usage: python scripts/extract-quests.py <path to system/apps/6rah>
Writes src/data/quest-rewards.json.

questitem.dat: 16-byte header (u32 count = 105), then (category, index) byte pairs;
  categories as in the shop tables (0 molds, 1 ores, 2 jewels, 3 other, 4 emblems).
How the game uses it (6RAH.APP, ARM code, VA base 0x10000000):
  0x10074220  tier = clamp(VP / 80, 0, 4)            VP = kingdom VP at ctx+0x434
  0x10074270  wanted item = entry tier*15 + rand%45
  0x1007428c  reward      = entry (tier+1)*15 + rand%45   (rand%30 at tier 4)
              re-rolled while the reward is the same item as the wanted one
  0x10074358  reward index stored in the town's quest slot (+0x24)
So a quest's reward is one of 45 entries (30 at 320+ VP), picked evenly.
"""
import json, os, sys

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def table(name):
    b = open(os.path.join(game, name), "rb").read()
    n = int.from_bytes(b[0:4], "little")
    return [b[16 + i * 48:16 + i * 48 + 32].split(b"\0")[0].decode("latin1") for i in range(n)]


cats = {i: table(f"item{i}.dat") for i in range(5)}
cats[0] = ["RankUp Mold" if n == "Symbol" else n for n in cats[0]]
# item4.dat has internal names for some emblems ("Deux", "7", ...); the English names are
# in english/itemdata.dat (64-byte UTF-16 records from 0x23B0), in the same order
eng = open(os.path.join(game, "english", "itemdata.dat"), "rb").read()
start = eng.find("Warrior Emblem".encode("utf-16-le"))  # 64-byte UTF-16 records
emblems_en = [eng[start + i * 64:start + (i + 1) * 64].decode("utf-16-le").split("")[0] for i in range(31)]
assert len(emblems_en) == len(cats[4]) == 31, "emblem tables differ"
cats[4] = emblems_en
site = {e["emblem"] for e in json.load(open(os.path.join(root, "src", "data", "emblems.json"), encoding="utf-8"))}
assert set(cats[4]) == site, f"emblem names differ from the site: {set(cats[4]) ^ site}"
q = open(os.path.join(game, "questitem.dat"), "rb").read()
n = int.from_bytes(q[0:4], "little")
assert n == 105, f"expected 105 quest items, found {n}"
items = []
for i in range(n):
    c, k = q[16 + 2 * i], q[17 + 2 * i]
    assert c in cats and k < len(cats[c]), f"bad quest item {i}: {c}/{k}"
    items.append({"category": ["Molds", "Ores", "Jewels", "Other Materials", "Emblems"][c], "name": cats[c][k]})

tiers = []
for t in range(5):
    first, size = (t + 1) * 15, 30 if t == 4 else 45
    tiers.append({"tier": t, "vpMin": t * 80, "vpMax": None if t == 4 else t * 80 + 79,
                  "first": first, "size": size, "rewards": [items[i]["name"] for i in range(first, first + size)]})
json.dump({"items": items, "tiers": tiers}, open(os.path.join(root, "src", "data", "quest-rewards.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
emb = {r for t in tiers for r in t["rewards"] if r.endswith("Emblem")}
print(f"wrote {n} quest items, 5 VP tiers; {len(emb)} emblems can be quest rewards")
