// Static search index, emitted as /search-index.json at build time.
import { craftRows, data, edgesByEmblem, iconFor, rawMaterials } from "@/lib/data";
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
    ...craftRows.map((c) => ({
      t: "item" as const,
      n: c.result,
      s: `${c.mold} · ${c.effect}`,
      h: `/crafting#${c.slug}`,
      i: iconFor(c.type),
      k: `${c.result} ${c.mold} ${c.type} ${c.effect}`.toLowerCase(),
    })),
  ];
  return Response.json({ v: items.length, items });
}
