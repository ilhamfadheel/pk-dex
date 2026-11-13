// Static search index, emitted as /search-index.json at build time.
import { cities, data, edgesByEmblem, equipment, iconFor, rawMaterials } from "@/lib/data";
import type { SearchItem } from "@/lib/types";

export const dynamic = "force-static";

export function GET() {
  const items: SearchItem[] = [
    ...data.units.map((u) => ({
      t: "unit" as const,
      n: u.name,
      s: `${u.race} · Rank ${u.rank}${u.ability ? ` · ${u.ability}` : ""}`,
      h: `/unit/${u.slug}`,
      i: u.img,
      k: `${u.name} ${u.race} ${u.ability} ${u.move}`.toLowerCase(),
    })),
    ...rawMaterials.map((m) => ({
      t: "material" as const,
      n: m.name,
      s: `${m.category} · ${m.effect || `Rarity ${m.rarity}`}`,
      h: `/materials/${data.materials[m.name].slug}`,
      i: data.materials[m.name].img,
      k: `${m.name} ${m.category} ${m.effect}`.toLowerCase(),
    })),
    ...Object.keys(data.emblems).map((e) => ({
      t: "emblem" as const,
      n: e,
      s: `Used for ${edgesByEmblem(e).length} rank-up${edgesByEmblem(e).length === 1 ? "" : "s"}`,
      h: `/emblems#${encodeURIComponent(e)}`,
      i: data.materials["RankUp Mold"].img,
      k: `${e} emblem`.toLowerCase(),
    })),
    ...cities.map((c) => ({
      t: "city" as const,
      n: c.name,
      s: `Sells ${c.units.join(", ")} · ${c.dungeons.length} dungeon${c.dungeons.length === 1 ? "" : "s"}`,
      h: `/cities/${c.slug}`,
      i: null,
      k: `${c.name} city town area ${c.dungeons.map((d) => d.name).join(" ")}`.toLowerCase(),
    })),
    // every weapon / armor / accessory (named ones also carry their crafting effect)
    ...equipment.map((e) => ({
      t: "equip" as const,
      n: e.name,
      s: `${e.type} · Tier ${e.tier}${e.atk ? ` · ATK +${e.atk}` : e.def ? ` · DEF +${e.def}` : ""}${e.effect ? ` · ${e.effect}` : ""}`,
      h: `/equipment#${e.slug}`,
      i: iconFor(e.category),
      k: `${e.name} ${e.type} ${e.category} ${e.effect} ${e.ore ?? ""}`.toLowerCase(),
    })),
  ];
  return Response.json({ v: items.length, items });
}
