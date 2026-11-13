"""Extract the world map (area positions, links between areas, VP needed to enter)
from the game program 6RAH.APP (EN-FR-DE-ES-IT release, 743,788 bytes).

Usage: python scripts/extract-world.py <path to system/apps/6rah>
Writes src/data/world.json.

Tables found in 6RAH.APP (all little-endian u32), indexed in the game's area order
(english/move.dat):
  0x963B4  42 x (region, x, y, ?)   region = 3x3 map grid cell (0 = NW ... 8 = SE),
                                    x/y = position on the world map
  0x96654  44 x (a, b)              links between areas (paths on the world map)
  0xAC704  42 x (vp, vp)            Victory Points needed to enter the area
Each table is validated before use, so another build of the game fails loudly instead
of producing a wrong map.
"""
import json, os, struct, sys

game = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = open(os.path.join(game, "6rah.app"), "rb").read()
N = 42

move = open(os.path.join(game, "english", "move.dat"), "rb").read()
names = [move[i * 48:(i + 1) * 48].decode("utf-16-le").split("\x1b")[0] for i in range(N)]

POS, LINKS, NLINKS, VP = 0x963B4, 0x96654, 44, 0xAC704
pos = [struct.unpack_from("<4I", app, POS + i * 16) for i in range(N)]
links = [struct.unpack_from("<2I", app, LINKS + i * 8) for i in range(NLINKS)]
vp_pairs = [struct.unpack_from("<2I", app, VP + i * 8) for i in range(N)]

# --- validation ---
assert len(app) == 743788, f"unexpected 6RAH.APP size {len(app)} (tables are for the 743,788-byte release)"
assert all(r[0] <= 8 and r[1] < 1000 and r[2] < 1000 for r in pos), "position table looks wrong"
assert all(a < N and b < N and a != b for a, b in links), "link table looks wrong"
assert all(a == b and a % 10 == 0 for a, b in vp_pairs), "VP table looks wrong"
assert vp_pairs[0][0] == 0, "start area should need 0 VP"
adj = {i: set() for i in range(N)}
for a, b in links:
    adj[a].add(b); adj[b].add(a)
seen, stack = {0}, [0]
while stack:
    for y in adj[stack.pop()]:
        if y not in seen:
            seen.add(y); stack.append(y)
assert len(seen) == N, "links don't connect every area"

# city names must match the site's (from the material data)
materials = json.load(open(os.path.join(root, "src", "data", "materials.json"), encoding="utf-8"))
site = {d["area"] for m in materials for d in m["dungeon_reward"]}
missing = set(names) - site
assert not missing, f"names not on the site: {missing}"

REGION = ["Northwest", "North", "Northeast", "West", "Central", "East", "Southwest", "South", "Southeast"]
out = [
    {
        "index": i,
        "city": names[i],
        "region": REGION[pos[i][0]],
        "x": pos[i][1],
        "y": pos[i][2],
        "vp": vp_pairs[i][0],
        "links": sorted(names[j] for j in adj[i]),
    }
    for i in range(N)
]
json.dump(out, open(os.path.join(root, "src", "data", "world.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"wrote {N} areas, {len(links)} links")
for a in out[:5]:
    print(f"  {a['city']}: {a['region']}, VP {a['vp']}, links {', '.join(a['links'])}")
