// World map: area positions, paths between areas and the VP needed to enter each,
// read from the game program (scripts/extract-world.py -> src/data/world.json).
import worldRaw from "@/data/world.json";

export interface Area {
  index: number;
  city: string;
  region: string;
  x: number;
  y: number;
  vp: number; // Victory Points your kingdom needs to enter
  links: string[];
}

export const areas = worldRaw as Area[];
export const areaByCity = new Map(areas.map((a) => [a.city, a]));
export const START = areas[0].city; // Elynotis: where the game begins

export interface Route {
  path: string[]; // START ... city
  vpNeeded: number; // highest VP requirement on the way (what you need to get there)
}

/**
 * Best route from the start to every area: the path whose highest VP requirement is
 * lowest (you can't pass an area you can't enter), then the fewest steps.
 */
function routes(): Map<string, Route> {
  const best = new Map<string, Route>([[START, { path: [START], vpNeeded: areaByCity.get(START)!.vp }]]);
  const queue: Route[] = [best.get(START)!];
  while (queue.length) {
    queue.sort((a, b) => a.vpNeeded - b.vpNeeded || a.path.length - b.path.length);
    const cur = queue.shift()!;
    const here = cur.path[cur.path.length - 1];
    if (best.get(here) !== cur) continue;
    for (const next of areaByCity.get(here)!.links) {
      const cand = { path: [...cur.path, next], vpNeeded: Math.max(cur.vpNeeded, areaByCity.get(next)!.vp) };
      const old = best.get(next);
      if (!old || cand.vpNeeded < old.vpNeeded || (cand.vpNeeded === old.vpNeeded && cand.path.length < old.path.length)) {
        best.set(next, cand);
        queue.push(cand);
      }
    }
  }
  return best;
}
export const routeTo = routes();

/** Areas in the order they become reachable (by VP needed, then distance). */
export const progression = [...areas].sort(
  (a, b) => routeTo.get(a.city)!.vpNeeded - routeTo.get(b.city)!.vpNeeded || routeTo.get(a.city)!.path.length - routeTo.get(b.city)!.path.length,
);
