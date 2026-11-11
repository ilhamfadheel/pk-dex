import "server-only";
// All game data is static JSON, read once at module scope. With Cache Components
// this makes every page part of the prerendered static shell (served from CDN).
import fs from "node:fs";
import path from "node:path";
import unitsRaw from "@/data/units.json";
import emblemsRaw from "@/data/emblems.json";
import materialsRaw from "@/data/materials.json";
import craftingRaw from "@/data/crafting.json";
import effectsRaw from "@/data/effects.json";
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

// Plain <img> tags don't get basePath applied automatically, so prefix here.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Archived icons are .gif; ones we generated (scripts/make-race-icons.mjs) are .png.
const raceImg = (n: number | null | undefined) => {
  if (n == null) return null;
  const f = [`${n}.gif`, `${n}.png`].find((x) => raceImgs.has(x));
  return f ? `${BASE}/img/races/${f}` : null;
};
const spriteFaces = listDir("sprite-face");
// Archived portrait if there is one; otherwise the unit's own battle sprite (idle
// frame); the race icon only as a last resort.
const unitImg = (id: number, slug: string, race: number | null | undefined) => {
  const f = `face${String(id).padStart(3, "0")}.gif`;
  if (unitImgs.has(f)) return `${BASE}/img/units/${f}`;
  if (spriteFaces.has(`${slug}.png`)) return `${BASE}/img/sprite-face/${slug}.png`;
  return raceImg(race) ?? `${BASE}/img/placeholder.svg`;
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
  return f && iconImgs.has(f) ? `${BASE}/img/icons/${f}` : null;
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
  /** Proper effect name(s), from the effect ids (the source chart's text has typos). */
  effect: string;
  /** What the effect does in game (reverse-engineered by the compendium project). */
  effectInfo: string;
  success: number;
}

// ---- effects ----
// Names as the game shows them on materials; ids from the compendium's effect table.
const tier = (base: string, first: number, n = 3) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [first + i, `${base} ${i + 1}`]));
const EFFECT_NAMES: Record<number, string> = {
  0: "ATK Up", 1: "ATK Down", 2: "DEF Up", 3: "DEF Down", 4: "AGI Up", 5: "AGI Down",
  6: "DEX Up", 7: "DEX Down", 8: "INT Up", 9: "INT Down", 10: "WIS Up", 11: "WIS Down",
  12: "Sleep", 13: "Deep Sleep", 14: "Sleep Resistance", 15: "Paralysis", 16: "Severe Paralysis",
  17: "Paralysis Resistance", 18: "Poison", 19: "Deadly Poison", 20: "Poison Resistance",
  21: "Silence", 22: "Strong Silence", 23: "Silence Resistance",
  ...tier("Auto HP Restore", 24), ...tier("HP Absorption", 27, 2), ...tier("Critical", 29),
  ...tier("Counter", 32), ...tier("Physical Reduction", 35),
  38: "Magic Reduction", 39: "Magic Reflection", 40: "Proof of Contract", 41: "Warrior's Spirit",
  42: "Mage's Spirit", 43: "Hero's Spirit", 44: "Self Destruct", 45: "Regenerate", 46: "Multiply",
  47: "Revive", 48: "Item Recovery", ...tier("Gold Recovery Up", 49),
};
const effectInfo = new Map((effectsRaw as { id: number; behavior: string }[]).map((e) => [e.id, e.behavior]));

// Item names the source chart misspells.
const ITEM_NAME_FIX: Record<string, string> = {
  "Fairy Cloack": "Fairy Cloak",
  ForestMace: "Forest Mace",
  NinjaBlade: "Ninja Blade",
  "Shinning Mace": "Shining Mace",
  "Shinning Robe": "Shining Robe",
  "Goliat Sling": "Goliath Sling",
  "Black Anis Claw": "Black Annis Claw",
};

const rawUnits = unitsRaw as unknown as RawUnit[];
export const rawMaterials = (materialsRaw as unknown as RawMaterial[]).map((m) => ({
  ...m,
  effect: m.effect === "-" ? "" : m.effect, // "-" means none in the source
}));
export const crafting: CraftRecipe[] = (
  craftingRaw as unknown as (Omit<CraftRecipe, "effectInfo"> & { effect_ids: number[] })[]
).map(({ effect_ids, ...c }) => ({
  ...c,
  result: ITEM_NAME_FIX[c.result] ?? c.result,
  effect: effect_ids.map((id) => EFFECT_NAMES[id] ?? c.effect).join(" + "),
  effectInfo: effect_ids.map((id) => effectInfo.get(id)).filter(Boolean).join(" · "),
}));

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
    img: unitImg(u.id, slugify(u.name), u.race_icon),
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

// ---- cities / areas (from each material's shops, area searches and dungeons) ----
export interface City {
  name: string;
  slug: string;
  shop: string[]; // material names sold here
  search: { material: string; offline: boolean; online: boolean }[];
  dungeons: { name: string; rewards: { material: string; floor: number | string }[] }[];
}
const cityMap = new Map<string, City>();
const city = (name: string) => {
  let c = cityMap.get(name);
  if (!c) cityMap.set(name, (c = { name, slug: slugify(name), shop: [], search: [], dungeons: [] }));
  return c;
};
for (const m of rawMaterials) {
  for (const s of m.purchase_in) city(s).shop.push(m.name);
  for (const a of m.area_searches) {
    const c = city(a.area);
    let row = c.search.find((r) => r.material === m.name);
    if (!row) c.search.push((row = { material: m.name, offline: false, online: false }));
    if (a.status === "Online") row.online = true;
    else row.offline = true;
  }
  for (const d of m.dungeon_reward) {
    const c = city(d.area);
    let dg = c.dungeons.find((x) => x.name === d.dungeon);
    if (!dg) c.dungeons.push((dg = { name: d.dungeon, rewards: [] }));
    dg.rewards.push({ material: m.name, floor: d.floors });
  }
}
const byRarity = (a: string, b: string) => (materials[a]?.rarity ?? 0) - (materials[b]?.rarity ?? 0) || a.localeCompare(b);
for (const c of cityMap.values()) {
  c.shop.sort(byRarity);
  c.search.sort((a, b) => byRarity(a.material, b.material));
  c.dungeons.sort((a, b) => a.name.localeCompare(b.name));
  for (const d of c.dungeons) d.rewards.sort((a, b) => Number(a.floor) - Number(b.floor) || byRarity(a.material, b.material));
}
export const cities = [...cityMap.values()].sort((a, b) => a.name.localeCompare(b.name));
export const cityBySlug = new Map(cities.map((c) => [c.slug, c]));
export const citySlug = (name: string) => slugify(name);

/** Rows for the Crafting page (ingredient names resolved, typed by mold). */
export const craftRows = crafting.map((c) => ({
  slug: slugify(c.result),
  result: c.result,
  type: (c.mold === "Armor" ? "Armor" : c.mold === "Accessories" ? "Accessories" : "Weapons") as
    | "Weapons"
    | "Armor"
    | "Accessories",
  mold: c.mold,
  ore: resolveMaterial(c.ore) ?? c.ore,
  items: [c.item1, c.item2].map((x) => (x === "Any" ? null : (resolveMaterial(x) ?? x))),
  effect: c.effect,
  effectInfo: c.effectInfo,
  success: c.success,
}));

export const craftsUsing = (name: string) =>
  crafting.filter((c) => [c.ore, c.item1, c.item2].some((x) => resolveMaterial(x) === name));
