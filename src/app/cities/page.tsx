import type { Metadata } from "next";
import CityList, { type CityRow } from "@/components/CityList";
import { cities, data } from "@/lib/data";

export const metadata: Metadata = { title: "Cities" };

const rows: CityRow[] = cities.map((c) => ({
  name: c.name,
  slug: c.slug,
  shop: c.shop,
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
          All {cities.length} locations: what each shop sells, what area searches turn up, and which dungeons give
          what. Pick a material to see every place you can get it.
        </p>
      </div>
      <CityList rows={rows} materials={data.materials} />
      <p className="mt-4 text-xs text-muted">
        From archived pk.warcry.com material pages (2006). Which units each city&apos;s shop sells isn&apos;t in any
        source we found; see the Shop table on the Units page.
      </p>
    </>
  );
}
