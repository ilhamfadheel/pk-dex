import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import shop from "@/data/shop-units.json";
import { MatChip, UnitImg } from "@/components/ui";
import { cities, cityBySlug, data } from "@/lib/data";

export function generateStaticParams() {
  return cities.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cities/[slug]">): Promise<Metadata> {
  return { title: cityBySlug.get((await params).slug)?.name ?? "City" };
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="font-semibold">{title}</h2>
      {sub && <p className="mb-2 text-xs text-muted">{sub}</p>}
      <div className={sub ? "" : "mt-2"}>{children}</div>
    </section>
  );
}

const ORDER: Record<string, number> = { Ores: 0, Jewels: 1, "Other Materials": 2 };

export default async function CityPage({ params }: PageProps<"/cities/[slug]">) {
  const c = cityBySlug.get((await params).slug);
  if (!c) notFound();
  const groups = Object.entries(
    c.shop.reduce<Record<string, string[]>>((g, m) => {
      const cat = data.materials[m]?.category ?? "Other";
      (g[cat] ??= []).push(m);
      return g;
    }, {}),
  ).sort(([a], [b]) => (ORDER[a] ?? 9) - (ORDER[b] ?? 9));
  const shopUnits = shop.units.map((n) => data.units.find((u) => u.name === n)).filter((u) => !!u);

  return (
    <article className="space-y-4">
      <nav className="text-xs text-muted">
        <Link href="/cities" className="hover:underline">Cities</Link> / {c.name}
      </nav>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{c.name}</h1>
        <p className="text-sm text-muted">
          Shop: {c.shop.length} materials · Area search: {c.search.length} · Dungeons: {c.dungeons.length}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Shop: materials" sub="Bought with gold in this city's shop.">
          {groups.length ? (
            <div className="space-y-2">
              {groups.map(([cat, ms]) => (
                <div key={cat}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{cat}</div>
                  <div className="flex flex-wrap gap-1.5">{ms.map((m) => <MatChip key={m} name={m} m={data.materials[m]} />)}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted">No material shop recorded here.</p>}
        </Section>

        <Section title="Shop: units" sub="Which units each city sells isn't in any source we found.">
          <p className="mb-2 text-sm text-muted">
            These are the units you start from (no rank-up leads to them), so they come from Shops or recruiting:
          </p>
          <div className="flex flex-wrap gap-2">
            {shopUnits.map((u) => (
              <Link key={u!.id} href={`/unit/${u!.slug}`} className="chip !py-1 hover:border-accent">
                <UnitImg u={u!} size={20} /> {u!.name}
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Area search" sub="Materials an area search here can turn up. Offline = single-player, Online = online play.">
        {c.search.length ? (
          <div className="flex flex-wrap gap-1.5">
            {c.search.map((s) => (
              <span key={s.material} className="inline-flex items-center gap-1">
                <MatChip name={s.material} m={data.materials[s.material]} />
                <span className="text-[10px] text-muted">{[s.offline && "Offline", s.online && "Online"].filter(Boolean).join(" / ")}</span>
              </span>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No area-search finds recorded.</p>}
      </Section>

      <Section title="Dungeons" sub="Rewards by floor.">
        {c.dungeons.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {c.dungeons.map((d) => (
              <div key={d.name} className="rounded-lg border border-line p-3">
                <div className="mb-2 font-medium">{d.name}</div>
                <ul className="space-y-1">
                  {d.rewards.map((r) => (
                    <li key={r.material} className="flex items-center gap-2 text-sm">
                      <span className="w-14 shrink-0 font-mono text-xs text-muted">Floor {r.floor}</span>
                      <MatChip name={r.material} m={data.materials[r.material]} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No dungeons recorded.</p>}
      </Section>
    </article>
  );
}
