import type { Metadata } from "next";
import CityList, { type CityRow } from "@/components/CityList";
import { cities, data } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Cities & Shops – Where to Buy Units & Items",
  description: `All ${cities.length} Pocket Kingdom: Own the World cities and areas: which units, ores, jewels and molds each shop sells, what area searches find, and every dungeon's rewards by floor.`,
  path: "/cities",
});

const rows: CityRow[] = cities.map((c) => ({
  name: c.name,
  slug: c.slug,
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
      <CityList rows={rows} materials={data.materials} />
      <p className="mt-4 text-xs text-muted">
        Shop stock read from the game&apos;s own shop tables; area searches and dungeon rewards from archived
        pk.warcry.com pages.
      </p>
    </>
  );
}
