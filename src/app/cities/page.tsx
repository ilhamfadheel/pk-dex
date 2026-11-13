import type { Metadata } from "next";
import CityList, { type CityRow } from "@/components/CityList";
import WorldMap from "@/components/WorldMap";
import { cities, citySlug, data } from "@/lib/data";
import { START, areaByCity, progression, routeTo } from "@/lib/world";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Cities & Shops – Where to Buy Units & Items",
  description: `All ${cities.length} Pocket Kingdom: Own the World cities and areas: which units, ores, jewels and molds each shop sells, what area searches find, and every dungeon's rewards by floor.`,
  path: "/cities",
});

const rows: CityRow[] = cities.map((c) => ({
  name: c.name,
  slug: c.slug,
  region: areaByCity.get(c.name)!.region,
  vp: areaByCity.get(c.name)!.vp,
  vpNeeded: routeTo.get(c.name)!.vpNeeded,
  steps: routeTo.get(c.name)!.path.length - 1,
  order: progression.findIndex((a) => a.city === c.name),
  units: c.units.map((n) => {
    const u = data.units.find((x) => x.name === n)!;
    return { name: u.name, img: u.img };
  }),
  shop: c.shop,
  molds: c.molds,
  search: c.search.map((s) => s.material),
  dungeonNames: c.dungeons.map((d) => d.name),
  dungeonRewards: [...new Set(c.dungeons.flatMap((d) => d.rewards.map((r) => r.material)))],
}));

export default function CitiesPage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Cities &amp; areas</h1>
        <p className="text-sm text-muted">
          All {cities.length} locations: the units, ores, jewels and molds each shop sells, what area searches turn
          up, and which dungeons give what. Pick a unit, mold or material to see every place you can get it.
        </p>
      </div>
      <section className="card mb-4 p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">World map</h2>
          <span className="text-xs text-muted">
            Start in {START} and follow the paths. Each area opens once your kingdom has its VP. Click an area for its route.
          </span>
        </div>
        <WorldMap slugOf={citySlug} current={START} />
      </section>
      <CityList rows={rows} materials={data.materials} unitOrder={Object.fromEntries(data.units.map((u) => [u.name, u.id]))} />
      <p className="mt-4 text-xs text-muted">
        Shop stock read from the game&apos;s own shop tables; area searches and dungeon rewards from archived
        pk.warcry.com pages.
      </p>
    </>
  );
}
