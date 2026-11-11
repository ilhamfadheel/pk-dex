import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MatChip, MatIcon, UnitImg, UnitLink } from "@/components/ui";
import { citySlug, craftsUsing, data, emblemsUsing, materialBySlug, rawMaterials, resolveMaterial, slugify, unitById } from "@/lib/data";

export function generateStaticParams() {
  return rawMaterials.map((m) => ({ slug: slugify(m.name) }));
}

export async function generateMetadata({ params }: PageProps<"/materials/[slug]">): Promise<Metadata> {
  return { title: materialBySlug.get((await params).slug)?.name ?? "Material" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function MaterialPage({ params }: PageProps<"/materials/[slug]">) {
  const raw = materialBySlug.get((await params).slug);
  if (!raw) notFound();
  const m = data.materials[raw.name];
  const emblems = emblemsUsing(raw.name);
  const crafts = craftsUsing(raw.name);
  const unlocks = data.edges.filter((e) =>
    (data.emblems[e.emblem] ?? []).some((r) => [r.ore, r.item1, r.item2].includes(raw.name)),
  );
  const none = <p className="text-sm text-muted">None recorded.</p>;

  return (
    <article className="space-y-4">
      <nav className="text-xs text-muted">
        <Link href="/materials" className="hover:underline">Materials</Link> / {raw.name}
      </nav>
      <header className="card flex items-center gap-4 p-5">
        <MatIcon m={m} size={56} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{raw.name}</h1>
          <p className="text-sm text-muted">
            {raw.category} · Rarity <span className="text-gold">{"★".repeat(raw.rarity)}</span> ({raw.rarity}) · {raw.effect || "No effect"}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Buy in">
          {raw.purchase_in.length ? (
            <div className="flex flex-wrap gap-1.5">{raw.purchase_in.map((s) => <Link key={s} href={`/cities/${citySlug(s)}`} className="chip hover:border-accent">{s}</Link>)}</div>
          ) : none}
        </Section>
        <Section title="Dropped by">
          {raw.dropped_by.length ? (
            <div className="flex flex-wrap gap-3">{raw.dropped_by.map((d) => {
              const u = unitById.get(d.id);
              return u ? <UnitLink key={d.id} u={u} size={28} /> : <span key={d.id}>{d.name}</span>;
            })}</div>
          ) : none}
        </Section>
      </div>

      <Section title={`Needed to rank up into (${unlocks.length})`}>
        {unlocks.length ? (
          <div className="flex flex-wrap gap-1.5">
            {unlocks.map((e, i) => {
              const a = unitById.get(e.from)!, b = unitById.get(e.to)!;
              return (
                <Link key={i} href={`/planner?from=${a.slug}&to=${b.slug}`} className="chip hover:border-accent">
                  <UnitImg u={a} size={16} /> {a.name} → <UnitImg u={b} size={16} /> <b>{b.name}</b>
                  <span className="text-muted">({e.emblem})</span>
                </Link>
              );
            })}
          </div>
        ) : none}
        {emblems.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Ingredient in: {emblems.map((e, i) => (
              <span key={e}>{i > 0 && ", "}<Link className="text-gold hover:underline" href={`/emblems#${encodeURIComponent(e)}`}>{e}</Link></span>
            ))}. Some emblems have alternative recipes that don&apos;t use this material.
          </p>
        )}
      </Section>

      {crafts.length > 0 && (
        <Section title="Crafting recipes">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">Result</th><th className="th">Mold</th><th className="th">Ingredients</th><th className="th">Effect</th><th className="th">%</th></tr></thead>
              <tbody>
                {crafts.map((c, i) => (
                  <tr key={i} className="border-t border-line/60">
                    <td className="td font-medium">{c.result}</td>
                    <td className="td text-muted">{c.mold}</td>
                    <td className="td"><div className="flex flex-wrap gap-1">{[c.ore, c.item1, c.item2].map((x) => {
                      const n = resolveMaterial(x);
                      return <MatChip key={x} name={n ?? x} m={n ? data.materials[n] : undefined} />;
                    })}</div></td>
                    <td className="td">
                      <div>{c.effect}</div>
                      {c.effectInfo && <div className="text-xs text-muted">{c.effectInfo}</div>}
                    </td>
                    <td className="td font-mono">{c.success}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Area searches">
          {raw.area_searches.length ? (
            <div className="flex flex-wrap gap-1.5">{raw.area_searches.map((a, i) => (
              <Link key={i} href={`/cities/${citySlug(a.area)}`} className="chip hover:border-accent">{a.area} <span className="text-muted">{a.status}</span></Link>
            ))}</div>
          ) : none}
        </Section>
        <Section title="Dungeon rewards">
          {raw.dungeon_reward.length ? (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto text-sm">{raw.dungeon_reward.map((d, i) => (
              <li key={i}>
                {d.dungeon}{" "}
                <span className="text-muted">
                  · <Link href={`/cities/${citySlug(d.area)}`} className="hover:text-accent hover:underline">{d.area}</Link> · floor {d.floors}
                </span>
              </li>
            ))}</ul>
          ) : none}
        </Section>
      </div>
    </article>
  );
}
