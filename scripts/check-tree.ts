// Checks every unit's evolution tree: no line may pass behind a unit box other
// than the two it connects, and no two units may overlap.
// Usage: node scripts/check-tree.ts
import fs from "node:fs";
import path from "node:path";
import { layoutTree, NODE_H, NODE_W, type TreeUnit } from "../src/lib/treeLayout.ts";

const root = path.resolve(import.meta.dirname, "..");
const raw = JSON.parse(fs.readFileSync(path.join(root, "src/data/units.json"), "utf8")) as {
  id: number; name: string; rank: number; advances: { id: number }[];
}[];
const units: (TreeUnit & { name: string })[] = raw.map((u) => ({
  id: u.id, name: u.name, rank: u.rank, next: u.advances.map((a) => a.id),
  prev: raw.filter((p) => p.advances.some((a) => a.id === u.id)).map((p) => p.id),
}));
const byId = new Map(units.map((u) => [u.id, u]));

// same family rule as the unit page: ancestors + descendants
function family(u: TreeUnit) {
  const seen = new Set([u.id]);
  for (const dir of ["prev", "next"] as const) {
    const stack = [u.id];
    while (stack.length) for (const n of byId.get(stack.pop()!)![dir]) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return [...seen].map((id) => byId.get(id)!);
}

// does segment p-q cross the rectangle (shrunk by 2px)?
function hits(p: [number, number], q: [number, number], r: { x: number; y: number }) {
  const x0 = r.x + 2, x1 = r.x + NODE_W - 2, y0 = r.y + 2, y1 = r.y + NODE_H - 2;
  for (let t = 0; t <= 1; t += 0.01) {
    const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
    if (x > x0 && x < x1 && y > y0 && y < y1) return true;
  }
  return false;
}

let problems = 0, checked = 0;
for (const u of units) {
  const t = layoutTree(family(u), u.id, byId);
  const pos = t.nodes.map((n) => `${n.x},${n.y}`);
  if (new Set(pos).size !== pos.length) { problems++; console.log(`${u.name}: overlapping units`); }
  for (const e of t.edges) {
    checked++;
    for (const n of t.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      for (let i = 0; i < e.points.length - 1; i++) {
        if (hits(e.points[i], e.points[i + 1], n)) {
          problems++;
          console.log(`${u.name} tree: line ${byId.get(e.from)!.name} -> ${byId.get(e.to)!.name} passes behind ${byId.get(n.id)!.name}`);
          break;
        }
      }
    }
  }
}
console.log(`${units.length} trees, ${checked} lines checked, ${problems} problems`);
process.exit(problems ? 1 : 0);
