import "server-only";
// All game data is static JSON, read once at module scope. With Cache Components
// this makes every page part of the prerendered static shell (served from CDN).
import fs from "node:fs";
import path from "node:path";
import unitsRaw from "@/data/units.json";
import emblemsRaw from "@/data/emblems.json";
import materialsRaw from "@/data/materials.json";
import craftingRaw from "@/data/crafting.json";
import type { Edge, MaterialLite, PlannerData, Recipe, UnitLite } from "./types";
import { RANKUP_MOLD } from "./plan";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ---- images (downloaded from archived pk.warcry.com) ----
const pub = path.join(process.cwd(), "public", "img");
const listDir = (d: string) => {
  try {
    return new Set(fs.readdirSync(path.join(pub, d)));
  } catch {
    return new Set<string>();
  }
};
const unitImgs = listDir("units");
const raceImgs = listDir("races");
const iconImgs = listDir("icons");

const raceImg = (n: number | null | undefined) =>
  n != null && raceImgs.has(`${n}.gif`) ? `/img/races/${n}.gif` : null;
const unitImg = (id: number, race: number | null | undefined) => {
  const f = `face${String(id).padStart(3, "0")}.gif`;
  return unitImgs.has(f) ? `/img/units/${f}` : (raceImg(race) ?? "/img/placeholder.svg");
};
const categoryIcon: Record<string, string> = {
  Jewels: "jewels.gif",
  Ores: "ores.gif",
  "Other Materials": "othermaterials.gif",
  Emblems: "emblems.gif",
  Weapons: "weapons.gif",
  Armor: "armor.gif",
  Accessories: "accessories.gif",
};
export const iconFor = (category: string) => {
  const f = categoryIcon[category];
  return f && iconImgs.has(f) ? `/img/icons/${f}` : null;
};

// ---- raw types ----
interface RawUnit {
  id: number;
  name: string;
  race: string;
  race_icon: number | null;
  rank: number;
  slots: number;
  move: string;
  sp: number | null;
  hp: number;
  atk: number;
  def: number;
  agi: number;
  dex: number;
  wis: number;
  int: number;
  hit: number;
  ability: string;
  advances: { id: number; name: string; rank: number; level: number; vp: number; emblem: string }[];
}
export interface RawMaterial {
  id: number;
  name: string;
  category: string;
  rarity: number;
  effect: string;
  purchase_in: string[];
  dropped_by: { id: number; name: string }[];
  area_searches: { area: string; status: string }[];
  dungeon_reward: { dungeon: string; area: string; floors: number | string }[];
}
export interface CraftRecipe {
  mold: string;
  ore: string;
  item1: string;
  item2: string;
  result: string;
  effect: string;
  success: number;
}

const rawUnits = unitsRaw as unknown as RawUnit[];
export const rawMaterials = materialsRaw as unknown as RawMaterial[];
export const crafting = craftingRaw as unknown as CraftRecipe[];

// ---- materials ----
const materials: Record<string, MaterialLite> = {};
for (const m of rawMaterials) {
  materials[m.name] = {
    name: m.name,
    slug: slugify(m.name),
    category: m.category,
    rarity: m.rarity,
    effect: m.effect,
    img: iconFor(m.category),
  };
}
materials[RANKUP_MOLD] = {
  name: RANKUP_MOLD,
  slug: "rankup-mold",
  category: "Molds",
  rarity: 1,
  effect: "Consumed by every emblem combine. Sold in the Shop from map 2.",
  img: iconFor("Emblems"),
};
const byNorm = new Map(Object.keys(materials).map((n) => [norm(n), n]));
const ALIAS: Record<string, string> = { chaostheart: "Chaos Heart" };
/** Map spellings from the crafting chart (e.g. "MercuryRock") to a material name. */
export const resolveMaterial = (s: string) => ALIAS[norm(s)] ?? byNorm.get(norm(s)) ?? null;

// ---- emblems ----
const emblems: Record<string, Recipe[]> = {};
for (const r of emblemsRaw as { emblem: string; ore: string; item1: string; item2: string; success: number }[]) {
  (emblems[r.emblem] ??= []).push({ ore: r.ore, item1: r.item1, item2: r.item2, success: r.success });
}

// ---- units + graph ----
const edges: Edge[] = rawUnits.flatMap((u) =>
  u.advances.map((a) => ({ from: u.id, to: a.id, rank: a.rank, level: a.level, vp: a.vp, emblem: a.emblem })),
);

const dropsByUnit = new Map<number, string[]>();
for (const m of rawMaterials)
  for (const d of m.dropped_by) {
    if (!dropsByUnit.has(d.id)) dropsByUnit.set(d.id, []);
    dropsByUnit.get(d.id)!.push(m.name);
  }

const units: UnitLite[] = rawUnits.map((u) => {
  const incoming = edges.filter((e) => e.to === u.id);
  const needs = new Set<string>();
  for (const e of incoming)
    for (const r of emblems[e.emblem] ?? []) [r.ore, r.item1, r.item2].forEach((x) => needs.add(x));
  return {
    id: u.id,
    slug: slugify(u.name),
    name: u.name,
    race: u.race,
    rank: u.rank,
    slots: u.slots,
    move: u.move,
    ability: u.ability || "",
    hp: u.hp,
    atk: u.atk,
    def: u.def,
    agi: u.agi,
    dex: u.dex,
    wis: u.wis,
    int: u.int,
    hit: u.hit,
    img: unitImg(u.id, u.race_icon),
    raceImg: raceImg(u.race_icon),
    next: u.advances.map((a) => a.id),
    prev: incoming.map((e) => e.from),
    needs: [...needs],
    drops: dropsByUnit.get(u.id) ?? [],
  };
});

export const data: PlannerData = { units, edges, emblems, materials };
export const unitById = new Map(units.map((u) => [u.id, u]));
export const unitBySlug = new Map(units.map((u) => [u.slug, u]));
export const materialBySlug = new Map(rawMaterials.map((m) => [slugify(m.name), m]));
export const spByUnit = new Map(rawUnits.map((u) => [u.id, u.sp]));

/** Which evolutions use a given emblem. */
export const edgesByEmblem = (emblem: string) => edges.filter((e) => e.emblem === emblem);

/** Emblems whose recipes use a material. */
export const emblemsUsing = (name: string) =>
  Object.entries(emblems)
    .filter(([, rs]) => rs.some((r) => [r.ore, r.item1, r.item2].includes(name)))
    .map(([e]) => e);

export const craftsUsing = (name: string) =>
  crafting.filter((c) => [c.ore, c.item1, c.item2].some((x) => resolveMaterial(x) === name));
