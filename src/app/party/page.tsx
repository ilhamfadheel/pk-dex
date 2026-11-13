import type { Metadata } from "next";
import PartyBuilder, { type AreaFoes } from "@/components/PartyBuilder";
import { cities, citySlug, data, enemiesByCity, unitPrices, unitSoldIn } from "@/lib/data";
import { areaByCity } from "@/lib/world";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Party Builder – Plan a Party and Its Match-ups",
  description:
    "Build a Pocket Kingdom: Own the World party of up to 4 units: total HP, ATK, DEF, AGI and search power, total price in gold, and how it stacks up against the enemy parties of all 42 areas.",
  path: "/party",
});

export default function PartyPage() {
  const id = new Map(data.units.map((u) => [u.name, u.id]));
  const areas: AreaFoes[] = cities.map((c) => ({
    city: c.name,
    slug: citySlug(c.name),
    vp: areaByCity.get(c.name)!.vp,
    parties: (enemiesByCity.get(c.name) ?? []).map((p) => p.map((n) => id.get(n)!)),
  }));
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Party builder</h1>
        <p className="text-sm text-muted">
          Put up to 4 units in a party to see its combined stats and price, then check it against the enemy parties of
          any area. Unit prices and enemy parties come from the game&apos;s own data files.
        </p>
      </div>
      <PartyBuilder units={data.units} prices={unitPrices} soldIn={Object.fromEntries(unitSoldIn)} areas={areas} />
    </>
  );
}
