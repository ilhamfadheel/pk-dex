// Shared, serialisable shapes. Safe to import from client components.

export type Stat = "hp" | "atk" | "def" | "agi" | "dex" | "wis" | "int" | "hit";
export const STATS: Stat[] = ["hp", "atk", "def", "agi", "dex", "wis", "int", "hit"];

export interface Edge {
  from: number;
  to: number;
  rank: number;
  level: number;
  vp: number;
  emblem: string;
}

export interface UnitLite {
  id: number;
  slug: string;
  name: string;
  race: string;
  rank: number;
  slots: number;
  move: string;
  ability: string;
  hp: number;
  atk: number;
  def: number;
  agi: number;
  dex: number;
  wis: number;
  int: number;
  hit: number;
  img: string;
  raceImg: string | null;
  /** Units this one can evolve into. */
  next: number[];
  /** Units that evolve into this one. */
  prev: number[];
  /** Materials (names) used by any emblem recipe for an evolution INTO this unit. */
  needs: string[];
  /** Materials this unit drops. */
  drops: string[];
}

export interface Recipe {
  ore: string;
  item1: string;
  item2: string;
  success: number;
}

export interface MaterialLite {
  name: string;
  slug: string;
  category: string;
  rarity: number;
  effect: string;
  img: string | null;
}

export interface SearchItem {
  t: "unit" | "material" | "emblem" | "item" | "city";
  n: string; // name
  s: string; // subtitle
  h: string; // href (without basePath)
  i: string | null; // image src
  k: string; // lowercase haystack
}

export interface PlannerData {
  units: UnitLite[];
  edges: Edge[];
  emblems: Record<string, Recipe[]>;
  materials: Record<string, MaterialLite>;
}
