import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import anims from "@/data/anims.json";
import EvolutionTree from "@/components/EvolutionTree";
import SpritePlayer, { type AnimData } from "@/components/SpritePlayer";
import RankupPlanner from "@/components/RankupPlanner";
import { MatChip, RecipeOptions, UnitImg } from "@/components/ui";
import { data, spByUnit, unitById, unitBySlug } from "@/lib/data";
import { STATS, type Edge, type UnitLite } from "@/lib/types";

export function generateStaticParams() {
  return data.units.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: PageProps<"/unit/[slug]">): Promise<Metadata> {
  const u = unitBySlug.get((await params).slug);
  return { title: u?.name ?? "Unit" };
}

const STAT_MAX: Record<string, number> = { hp: 260, atk: 100, def: 75, agi: 85, dex: 100, wis: 100, int: 100, hit: 80 };

/** The unit's evolution line: everything it comes from plus everything it can become. */
function family(u: UnitLite) {
  const seen = new Set([u.id]);
  for (const dir of ["prev", "next"] as const) {
    const stack = [u.id];
    while (stack.length) {
      for (const n of unitById.get(stack.pop()!)![dir]) if (!seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  return [...seen].map((id) => unitById.get(id)!);
}

function EdgeCard({ e, other, dir }: { e: Edge; other: UnitLite; dir: "from" | "to" }) {
  const rs = data.emblems[e.emblem] ?? [];
  return (
    <li className="card p-3">
      <div className="flex items-center gap-3">
        <Link href={`/unit/${other.slug}`} className="flex items-center gap-2 hover:text-accent">
          <UnitImg u={other} size={44} />
          <div>
            <div className="text-[11px] text-muted">{dir === "from" ? "Evolves from" : "Evolves into"}</div>
            <div className="font-medium">{other.name}</div>
          </div>
        </Link>
        <div className="ml-auto flex flex-wrap justify-end gap-1 text-xs">
          <span className="chip">Lv {e.level}</span>
          <span className="chip">{e.vp} VP</span>
        </div>
      </div>
      <div className="mt-2 space-y-1.5 border-t border-line pt-2 text-xs">
        <div className="flex items-center gap-2">
          <Link href={`/emblems#${encodeURIComponent(e.emblem)}`} className="font-semibold text-gold hover:underline">{e.emblem}</Link>
          <span className="text-muted">{rs.length} way{rs.length === 1 ? "" : "s"} to make it</span>
        </div>
        <RecipeOptions recipes={rs} materials={data.materials} />
      </div>
    </li>
  );
}

export default async function UnitPage({ params }: PageProps<"/unit/[slug]">) {
  const u = unitBySlug.get((await params).slug);
  if (!u) notFound();

  const inEdges = data.edges.filter((e) => e.to === u.id);
  const outEdges = data.edges.filter((e) => e.from === u.id);
  const fam = family(u);
  const sp = spByUnit.get(u.id);
  const notInGuide = u.name === "O'Rosam";
  const anim = (anims as Record<string, AnimData>)[u.slug];

  return (
    <article className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted">
        <span>
          <Link href="/" className="hover:underline">Units</Link> / {u.name}
        </span>
        <Link href={`/compare?u=${u.slug}`} className="chip ml-auto !py-1 !text-xs hover:border-accent hover:text-ink">
          ⇄ Compare with other units
        </Link>
      </nav>

      {/* Header */}
      <section className="card grid gap-5 p-5 md:grid-cols-[auto_1fr_1fr]">
        <div className="flex flex-col items-center gap-2">
          <UnitImg u={u} size={128} />
          <div className="flex gap-1 text-xs">
            <span className="chip">{u.move}</span>
            <span className="chip">{u.slots} slot{u.slots > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted">#{String(u.id + 1).padStart(3, "0")}</div>
          <h1 className="text-3xl font-bold tracking-tight">{u.name}</h1>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Race</dt>
            <dd className="flex items-center gap-1.5">
              {u.raceImg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.raceImg} alt="" width={16} height={16} className="pixel" />
              )}
              {u.race}
            </dd>
            <dt className="text-muted">Rank</dt><dd>{u.rank}</dd>
            <dt className="text-muted">Ability</dt><dd>{u.ability || "—"}</dd>
            {sp != null && <><dt className="text-muted">SP</dt><dd>{sp}</dd></>}
            <dt className="text-muted">Stage</dt>
            <dd>{u.prev.length === 0 ? "Base unit" : u.next.length === 0 ? "Final form" : "Middle form"}</dd>
          </dl>
          {notInGuide && (
            <p className="mt-3 rounded-md bg-panel-2 p-2 text-xs text-muted">
              Secret unit. It isn&apos;t in the GameFAQs rank-up guide; data comes from the archived warcry database.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          {STATS.map((s) => (
            <div key={s} className="grid grid-cols-[40px_36px_1fr] items-center gap-2 text-sm">
              <span className="text-xs font-semibold uppercase text-muted">{s === "hit" ? "Hit%" : s}</span>
              <span className="text-right font-mono tabular-nums">{u[s]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-panel-2">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (u[s] / STAT_MAX[s]) * 100)}%` }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Battle sprite */}
      {anim && (
        <section>
          <h2 className="mb-2 font-semibold">Battle animations</h2>
          <div className="card grid gap-4 p-4 sm:grid-cols-[minmax(240px,320px)_1fr] sm:items-center">
            <SpritePlayer
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/img/anim/${u.slug}.png`}
              data={anim}
              name={u.name}
              skillName={u.ability || undefined}
            />
            <div className="space-y-2 text-sm text-muted">
              <p>Click the sprite to attack, or pick an animation. Idle and Walk loop; the others play once.</p>
              {anim.match === "guess" && (
                <p className="rounded-md bg-panel-2 p-2 text-xs">
                  {u.name}&apos;s line shares one sprite in different colours, and this unit has no portrait to
                  match against, so its colour may be swapped with another unit in the same line.
                </p>
              )}
              <p className="text-xs">
                Sprites ripped by CrimsonPenguin (The Spriters Resource). Game art © SEGA.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Evolution links */}
      {(inEdges.length > 0 || outEdges.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold">Evolves from</h2>
            {inEdges.length ? (
              <ul className="space-y-2">{inEdges.map((e, i) => <EdgeCard key={i} e={e} other={unitById.get(e.from)!} dir="from" />)}</ul>
            ) : <p className="text-sm text-muted">Base unit: recruit it directly.</p>}
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Evolves into</h2>
            {outEdges.length ? (
              <ul className="space-y-2">{outEdges.map((e, i) => <EdgeCard key={i} e={e} other={unitById.get(e.to)!} dir="to" />)}</ul>
            ) : <p className="text-sm text-muted">Final form.</p>}
          </div>
        </section>
      )}

      {/* Family */}
      <section>
        <h2 className="mb-2 font-semibold">Evolution family</h2>
        <EvolutionTree family={fam} current={u.id} byId={unitById} />
      </section>

      {/* Planner */}
      {inEdges.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">How to get {u.name}: total materials</h2>
          <p className="mb-3 text-sm text-muted">
            Pick a starting unit, or leave it on &quot;Any base unit&quot; to see every route. Recipes default to the
            cheapest (lowest rarity) option; change any step to recalculate.
          </p>
          <RankupPlanner data={data} initialFrom={null} initialTo={u.id} lockTarget />
        </section>
      )}

      {/* Drops */}
      {u.drops.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Drops</h2>
          <div className="flex flex-wrap gap-1.5">
            {u.drops.map((n) => <MatChip key={n} name={n} m={data.materials[n]} />)}
          </div>
        </section>
      )}
    </article>
  );
}
