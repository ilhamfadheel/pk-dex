// Client-side site search over /search-index.json, with three caches:
// 1) in-memory index shared across navigations, 2) a localStorage copy keyed by build,
// so a returning visitor never refetches, 3) memoised results per query.
import type { SearchItem } from "./types";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STORE_KEY = `pkdex-search-${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

let indexCache: SearchItem[] | null = null;
let indexPromise: Promise<SearchItem[]> | null = null;
const resultCache = new Map<string, SearchItem[]>();

export const cachedIndex = () => indexCache;

export function loadIndex(): Promise<SearchItem[]> {
  if (indexCache) return Promise.resolve(indexCache);
  if (indexPromise) return indexPromise;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      indexCache = JSON.parse(raw) as SearchItem[];
      return Promise.resolve(indexCache);
    }
  } catch {}
  indexPromise = fetch(`${BASE}/search-index.json`)
    .then((r) => r.json())
    .then((d: { items: SearchItem[] }) => {
      indexCache = d.items;
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("pkdex-search-")) localStorage.removeItem(k);
        localStorage.setItem(STORE_KEY, JSON.stringify(d.items));
      } catch {}
      return d.items;
    })
    .finally(() => {
      indexPromise = null;
    });
  return indexPromise;
}

const TYPE_WEIGHT: Record<SearchItem["t"], number> = { unit: 0, material: 0.1, item: 0.15, equip: 0.15, city: 0.18, emblem: 0.2 };

export function searchItems(items: SearchItem[], q: string, limit = 40): SearchItem[] {
  const key = q.trim().toLowerCase();
  if (!key) return [];
  const cacheKey = `${limit}:${key}`;
  const hit = resultCache.get(cacheKey);
  if (hit) return hit;
  const words = key.split(/\s+/);
  const scored: { it: SearchItem; s: number }[] = [];
  for (const it of items) {
    if (!words.every((w) => it.k.includes(w))) continue;
    const name = it.n.toLowerCase();
    const s = (name === key ? 0 : name.startsWith(key) ? 1 : name.includes(key) ? 2 : 3) + (TYPE_WEIGHT[it.t] ?? 0.3);
    scored.push({ it, s });
  }
  const out = scored.sort((a, b) => a.s - b.s || a.it.n.localeCompare(b.it.n)).slice(0, limit).map((x) => x.it);
  if (resultCache.size > 300) resultCache.delete(resultCache.keys().next().value!);
  resultCache.set(cacheKey, out);
  return out;
}

export const TYPE_LABEL: Record<SearchItem["t"], string> = {
  unit: "Units",
  material: "Materials",
  item: "Crafted items",
  equip: "Equipment",
  emblem: "Emblems",
  city: "Cities",
};
