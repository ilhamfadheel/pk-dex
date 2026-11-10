// Evolution tree layout + line routing. Pure (no imports), so it can also run in
// scripts/check-tree.ts to verify that no line passes behind a unit.

export interface TreeUnit {
  id: number;
  rank: number;
  next: number[];
  prev: number[];
}

export const COL_W = 124; // px per rank column
export const ROW_H = 100; // px per lane (node ~84px tall, leaving a free strip between rows)
export const IMG = 40;
export const TOP = 22; // room for the rank labels
export const NODE_W = 92;
export const NODE_H = 84;

export interface TreeLayout {
  ranks: number[];
  width: number;
  height: number;
  nodes: { id: number; x: number; y: number; col: number; lane: number }[]; // x,y = node box top-left
  edges: { from: number; to: number; points: [number, number][] }[];
  ancestorsOfCurrent: Set<number>;
}

export function layoutTree(family: TreeUnit[], current: number, byId: Map<number, TreeUnit>): TreeLayout {
  const inFam = new Set(family.map((u) => u.id));
  const ranks = [...new Set(family.map((u) => u.rank))].sort((a, b) => a - b);
  const colOf = new Map(ranks.map((r, i) => [r, i]));
  const parents = (u: TreeUnit) => u.prev.filter((p) => inFam.has(p));
  const children = (u: TreeUnit) => u.next.filter((c) => inFam.has(c)).map((c) => byId.get(c)!);

  const ancestorsOfCurrent = new Set<number>();
  const st = [current];
  while (st.length) for (const p of byId.get(st.pop()!)!.prev) if (!ancestorsOfCurrent.has(p)) { ancestorsOfCurrent.add(p); st.push(p); }

  // Lanes: a chain of rank-ups stays on one row; each extra branch opens a new row.
  const roots = family
    .filter((u) => parents(u).length === 0)
    .sort((a, b) => Number(ancestorsOfCurrent.has(b.id)) - Number(ancestorsOfCurrent.has(a.id)) || a.id - b.id);
  const laneOf = new Map<number, number>();
  let lanes = 0;
  const place = (u: TreeUnit, l: number) => {
    if (laneOf.has(u.id)) return;
    laneOf.set(u.id, l);
    const kids = children(u).sort((a, b) => a.rank - b.rank || a.id - b.id);
    kids.forEach((k, i) => place(k, i === 0 && !laneOf.has(k.id) ? l : lanes++));
  };
  for (const r of roots) place(r, lanes++);
  const used = [...new Set(laneOf.values())].sort((a, b) => a - b);
  const remap = new Map(used.map((l, i) => [l, i]));
  for (const [id, l] of laneOf) laneOf.set(id, remap.get(l)!);

  const col = (u: TreeUnit) => colOf.get(u.rank)!;
  const lane = (u: TreeUnit) => laneOf.get(u.id)!;
  const cx = (c: number) => c * COL_W + COL_W / 2;
  const cy = (l: number) => TOP + l * ROW_H + 8 + IMG / 2; // centre of the portrait
  const gapX = (c: number) => (c + 1) * COL_W; // empty vertical strip right of column c
  // empty horizontal strip just above lane l (or below the last lane)
  const stripY = (l: number) => TOP + l * ROW_H - (ROW_H - NODE_H) / 2;

  // which columns each lane occupies
  const occupied = new Map<number, Set<number>>();
  for (const u of family) {
    if (!occupied.has(lane(u))) occupied.set(lane(u), new Set());
    occupied.get(lane(u))!.add(col(u));
  }
  const clear = (l: number, from: number, to: number) => {
    for (let c = from + 1; c < to; c++) if (occupied.get(l)?.has(c)) return false;
    return true;
  };

  const edges = family.flatMap((a) =>
    children(a).map((b) => {
      const ca = col(a), cb = col(b), la = lane(a), lb = lane(b);
      const start: [number, number] = [cx(ca) + IMG / 2 + 2, cy(la)];
      const end: [number, number] = [cx(cb) - IMG / 2 - 2, cy(lb)];
      let points: [number, number][];
      if (la === lb && clear(la, ca, cb)) {
        points = [start, end]; // straight along the row
      } else if (la !== lb && clear(lb, -1, cb) && cb > ca) {
        // new branch: drop in the gap right after the parent, then run along the
        // branch's own (still empty) row
        points = [start, [gapX(ca), start[1]], [gapX(ca), end[1]], end];
      } else if (la !== lb && clear(la, ca, cb)) {
        // joining an existing line: run along the parent's row, turn in the gap
        // right before the child
        points = [start, [gapX(cb - 1), start[1]], [gapX(cb - 1), end[1]], end];
      } else {
        // both rows busy: use the empty strip between rows
        const y = lb > 0 ? stripY(lb) : stripY(1);
        points = [start, [gapX(ca), start[1]], [gapX(ca), y], [gapX(cb - 1), y], [gapX(cb - 1), end[1]], end];
      }
      return { from: a.id, to: b.id, points };
    }),
  );

  return {
    ranks,
    width: ranks.length * COL_W,
    height: TOP + used.length * ROW_H,
    nodes: family.map((u) => ({ id: u.id, x: cx(col(u)) - NODE_W / 2, y: TOP + lane(u) * ROW_H, col: col(u), lane: lane(u) })),
    edges,
    ancestorsOfCurrent,
  };
}

/** SVG path through the points with rounded corners. */
export function roundedPath(pts: [number, number][], r = 8): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(x - px, y - py), d2 = Math.hypot(nx - x, ny - y);
    const k = Math.min(r, d1 / 2, d2 / 2);
    if (k < 0.5) { d += ` L${x},${y}`; continue; }
    const ax = x - ((x - px) / d1) * k, ay = y - ((y - py) / d1) * k;
    const bx = x + ((nx - x) / d2) * k, by = y + ((ny - y) / d2) * k;
    d += ` L${ax},${ay} Q${x},${y} ${bx},${by}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx},${ly}`;
}
