"""Area-search finds per area, from the game's product.dat.

Usage: python scripts/extract-searches.py <path to system/apps/6rah>
Writes src/data/searches.json: [{ city, offline: [5 names], online: [5 names] }].

product.dat: 16-byte header (u32 count = 42), then one 24-byte record per area in
english/move.dat order: 5 offline finds then 5 online finds, each a (category, index)
byte pair (1 ores, 2 jewels, 3 other materials), then 4 bytes of padding.
"""
import json, os, re, sys

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())


def table(name):
    b = open(os.path.join(game, name), "rb").read()
    n = int.from_bytes(b[0:4], "little")
    return [b[16 + i * 48:16 + i * 48 + 32].split(b"\0")[0].decode("latin1") for i in range(n)]


site = {norm(m["name"]): m["name"] for m in json.load(open(os.path.join(root, "src", "data", "materials.json"), encoding="utf-8"))}
site[norm("Sh\x82\x99ff Rock")] = "Shyff Rock"  # garbled in item3.dat
cats = {c: [site[norm(n)] for n in table(f"item{c}.dat")] for c in (1, 2, 3)}

move = open(os.path.join(game, "english", "move.dat"), "rb").read()
names = [move[i * 48:(i + 1) * 48].decode("utf-16-le").split("\x1b")[0] for i in range(42)]
d = open(os.path.join(game, "product.dat"), "rb").read()
assert len(d) == 16 + 42 * 24 and int.from_bytes(d[:4], "little") == 42, "unexpected product.dat"
out = []
for a, city in enumerate(names):
    r = d[16 + a * 24:16 + (a + 1) * 24]
    pick = lambda base: [cats[r[base + 2 * k]][r[base + 2 * k + 1]] for k in range(5)]
    out.append({"city": city, "offline": pick(0), "online": pick(10)})
json.dump(out, open(os.path.join(root, "src", "data", "searches.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"wrote area searches for {len(out)} areas")
