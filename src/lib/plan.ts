// Pure path-finding + material totals. Runs on server and client.
import type { Edge, PlannerData, Recipe } from "./types";

export const RANKUP_MOLD = "RankUp Mold";

/** Every evolution path from `from` to `to` (DAG, so DFS is fine). */
export function findPaths(edges: Edge[], from: number, to: number): Edge[][] {
  const out = new Map<number, Edge[]>();
  for (const e of edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from)!.push(e);
  }
  const paths: Edge[][] = [];
  const walk = (at: number, acc: Edge[], seen: Set<number>) => {
    if (at === to && acc.length) {
      paths.push(acc);
      return;
    }
    for (const e of out.get(at) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      walk(e.to, [...acc, e], seen);
      seen.delete(e.to);
    }
  };
  walk(from, [], new Set([from]));
  return paths.sort((a, b) => a.length - b.length || battles(a) - battles(b));
}

/** Paths into `to` starting from every base unit (one with no predecessors). */
export function pathsFromBases(data: PlannerData, to: number): Edge[][] {
  const bases = data.units.filter((u) => u.prev.length === 0).map((u) => u.id);
  if (bases.includes(to)) return [];
  return bases
    .flatMap((b) => findPaths(data.edges, b, to))
    .sort((a, b) => a.length - b.length || battles(a) - battles(b));
}

/** VP is a kingdom threshold, not spent (per the Rankup Guide), so the path needs the max. */
export const vpNeeded = (path: Edge[]) => path.reduce((s, e) => Math.max(s, e.vp), 0);
/** Units reset to level 0 after each rank-up and gain 1 level per battle. */
export const battles = (path: Edge[]) => path.reduce((s, e) => s + e.level, 0);

/** Pick the recipe with the lowest total rarity (cheapest/easiest to find). */
export function cheapestRecipe(data: PlannerData, emblem: string): number {
  const rs = data.emblems[emblem] ?? [];
  let best = 0;
  let bestScore = Infinity;
  rs.forEach((r, i) => {
    const score = [r.ore, r.item1, r.item2].reduce(
      (s, m) => s + (data.materials[m]?.rarity ?? 5),
      0,
    );
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export interface MaterialTotal {
  name: string;
  count: number;
  /** Count if you also budget for failed combines (expected value). */
  expected: number;
}

export function totals(
  data: PlannerData,
  path: Edge[],
  choice: Record<string, number>,
): MaterialTotal[] {
  const m = new Map<string, MaterialTotal>();
  const add = (name: string, n: number, exp: number) => {
    const t = m.get(name) ?? { name, count: 0, expected: 0 };
    t.count += n;
    t.expected += exp;
    m.set(name, t);
  };
  for (const e of path) {
    const r: Recipe | undefined =
      data.emblems[e.emblem]?.[choice[e.emblem] ?? cheapestRecipe(data, e.emblem)];
    if (!r) continue;
    const tries = 100 / r.success;
    for (const name of [r.ore, r.item1, r.item2, RANKUP_MOLD]) add(name, 1, tries);
  }
  const order: Record<string, number> = { Ores: 0, Jewels: 1, "Other Materials": 2 };
  return [...m.values()].sort(
    (a, b) =>
      (order[data.materials[a.name]?.category] ?? 9) -
        (order[data.materials[b.name]?.category] ?? 9) ||
      (data.materials[a.name]?.rarity ?? 0) - (data.materials[b.name]?.rarity ?? 0),
  );
}
