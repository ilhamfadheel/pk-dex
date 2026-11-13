"""The order items appear in the game's inventory and lists, from its own item tables.

Usage: python scripts/extract-item-order.py <path to system/apps/6rah>
Writes src/data/item-order.json: { item name: order }.

order = category * 1000 + index, categories in the game's order:
  0 molds (item0.dat), 1 ores (item1), 2 jewels (item2), 3 other materials (item3),
  4 emblems (item4), 5 weapons (equip0), 6 armor (equip1), 7 accessories (equip2)
Names are matched to the site's spelling and every site material/emblem must be found.
"""
import json, os, re, sys

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())


def table(name):
    b = open(os.path.join(game, name), "rb").read()
    n = int.from_bytes(b[0:4], "little")
    return [b[16 + i * 48:16 + i * 48 + 32].split(b"\0")[0].decode("latin1") for i in range(n)]


tables = [table(f"item{i}.dat") for i in range(5)] + [table(f"equip{i}.dat") for i in range(3)]
# molds: "Sword" -> "Sword Mold"; "Symbol" is the RankUp mold
tables[0] = ["RankUp Mold" if n == "Symbol" else f"{n} Mold" for n in tables[0]]
# emblems: English names (english/itemdata.dat, 64-byte UTF-16 records), same order
eng = open(os.path.join(game, "english", "itemdata.dat"), "rb").read()
start = eng.find("Warrior Emblem".encode("utf-16-le"))
tables[4] = [eng[start + i * 64:start + (i + 1) * 64].decode("utf-16-le").split("\x1b")[0] for i in range(len(tables[4]))]

site_mats = [m["name"] for m in json.load(open(os.path.join(root, "src", "data", "materials.json"), encoding="utf-8"))]
site_emb = sorted({e["emblem"] for e in json.load(open(os.path.join(root, "src", "data", "emblems.json"), encoding="utf-8"))})
site_eq = [e["name"] for e in json.load(open(os.path.join(root, "src", "data", "equipment.json"), encoding="utf-8"))]
site = {norm(n): n for n in site_mats + site_emb + site_eq}
site[norm("Shyff Rock")] = "Shyff Rock"
FIX = {norm("Sh\x82\x99ff Rock"): "Shyff Rock"}  # garbled in item3.dat

order = {}
for c, names in enumerate(tables):
    for i, n in enumerate(names):
        key = norm(n)
        name = FIX.get(key) or site.get(key) or n
        order.setdefault(name, c * 1000 + i)

missing = [n for n in site_mats + site_emb + site_eq if n not in order]
assert not missing, f"not found in the game's tables: {missing}"
json.dump(order, open(os.path.join(root, "src", "data", "item-order.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"wrote game order for {len(order)} items")
