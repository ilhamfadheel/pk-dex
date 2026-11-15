import Link from "next/link";
import type { Metadata } from "next";
import CityList, { type CityRow } from "@/components/CityList";
import WorldMap from "@/components/WorldMap";
import { cities, citySlug, data } from "@/lib/data";
import { START, areaByCity, areas, opensAfter, progression, routeTo, unlockChain } from "@/lib/world";
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

// Areas in the order you can open them: by the highest VP on their boss chain, then chain length.
const unlockOrder = [...areas]
  .map((a) => {
    const chain = unlockChain(a.city);
    return { a, vp: Math.max(a.vp, ...chain.map((c) => areaByCity.get(c)!.vp)), n: chain.length };
  })
  .sort((x, y) => x.vp - y.vp || x.n - y.n)
  .map((x) => x.a);

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
            Start in {START}. An area opens when you beat the boss of the areas it needs (table below) and your kingdom has its VP. Click an area for its route.
          </span>
        </div>
        <WorldMap slugOf={citySlug} current={START} />
      </section>
      <section className="card mb-4 p-4">
        <h2 className="font-semibold">How each area opens</h2>
        <p className="mb-3 text-xs text-muted">
          From the game&apos;s unlock table: after every boss win the game opens each area whose required area bosses are
          all beaten. You still need the area&apos;s VP to enter. Ordered by when you can open them.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Area</th>
                <th className="th">VP</th>
                <th className="th">Beat the boss of</th>
                <th className="th">Its boss opens</th>
              </tr>
            </thead>
            <tbody>
              {unlockOrder.map((a) => (
                <tr key={a.city} className="border-t border-line/60 align-top">
                  <td className="td font-medium"><Link href={`/cities/${citySlug(a.city)}`} className="hover:text-accent hover:underline">{a.city}</Link></td>
                  <td className="td font-mono text-xs text-gold">{a.vp}</td>
                  <td className="td">
                    {a.requires.length ? (
                      <div className="flex flex-wrap gap-1">
                        {a.requires.map((r) => <Link key={r} href={`/cities/${citySlug(r)}`} className="chip !py-0.5 hover:border-accent">{r}</Link>)}
                      </div>
                    ) : <span className="text-xs text-muted">Start</span>}
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {(opensAfter.get(a.city) ?? []).map((o) => <Link key={o} href={`/cities/${citySlug(o)}`} className="chip !py-0.5 hover:border-accent">{o}</Link>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <CityList rows={rows} materials={data.materials} unitOrder={Object.fromEntries(data.units.map((u) => [u.name, u.id]))} />
      <p className="mt-4 text-xs text-muted">
        Shop stock read from the game&apos;s own shop tables; area searches and dungeon rewards from archived
        pk.warcry.com pages.
      </p>
    </>
  );
}
