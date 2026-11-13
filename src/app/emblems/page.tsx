import Link from "next/link";
import type { Metadata } from "next";
import { MatChip, MatIcon, UnitImg } from "@/components/ui";
import { data, edgesByEmblem, unitById } from "@/lib/data";
import { RANKUP_MOLD } from "@/lib/plan";
import { pageMeta } from "@/lib/seo";
import questRaw from "@/data/quest-rewards.json";

// Townsfolk quest rewards (scripts/extract-quests.py, from the game's questitem.dat and
// its reward code): the pool depends on your kingdom's VP; each reward is one of `size`
// entries picked evenly.
type Tier = { tier: number; vpMin: number; vpMax: number | null; size: number; rewards: string[] };
const TIERS = (questRaw as { tiers: Tier[] }).tiers;
const vpLabel = (t: Pick<Tier, "vpMin" | "vpMax">) => (t.vpMax == null ? `${t.vpMin}+ VP` : `${t.vpMin}–${t.vpMax} VP`);
function questSources(emblem: string) {
  const tiers = TIERS.filter((t) => t.rewards.includes(emblem));
  if (!tiers.length) return null;
  const vpMin = tiers[0].vpMin, vpMax = tiers[tiers.length - 1].vpMax;
  const odds = tiers.map((t) => t.rewards.filter((r) => r === emblem).length / t.size);
  return { tiers, range: vpLabel({ vpMin, vpMax }), pct: Math.round(Math.max(...odds) * 1000) / 10, per: Math.round(1 / Math.max(...odds)) };
}

export const metadata: Metadata = pageMeta({
  title: "Emblem Recipes – Every Rank-up Emblem",
  description:
    "All 31 Pocket Kingdom: Own the World rank-up emblems: their 70 Lab recipes, which emblems townsfolk give as quest rewards and at what VP, success rates, and which unit rank-ups use each one.",
  path: "/emblems",
});

export default function EmblemsPage() {
  const list = Object.entries(data.emblems);
  const questCount = list.filter(([n]) => questSources(n)).length;
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Emblems</h1>
        <p className="text-sm text-muted">
          Combine an ore, a jewel and an item in the Lab (plus one {RANKUP_MOLD}, sold in Shops from map 2).
          Emblems are consumed when you rank up a unit. {list.length} emblems, {list.reduce((s, [, r]) => s + r.length, 0)} recipes.
        </p>
      </div>

      <section className="card mb-4 p-4">
        <h2 className="font-semibold">Where emblems drop</h2>
        <p className="mb-3 text-sm text-muted">
          Besides the Lab, the only source is <b className="text-ink">townsfolk quests</b>: bring a townsperson the item
          they ask for and they may give an emblem. Which emblems can turn up depends on your kingdom&apos;s VP, not on the
          town. Each quest&apos;s reward is picked evenly from a pool of 45 items (30 at 320+ VP), so any one emblem is a
          1 in 45 chance per quest. {questCount} of the {list.length} emblems can be quest rewards; the rest are Lab only.
          No enemy drops, dungeon floor rewards or area clear rewards include emblems (the game&apos;s drop and reward
          tables have none).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr><th className="th w-32">Kingdom VP</th><th className="th">Emblems a quest can reward</th></tr>
            </thead>
            <tbody>
              {TIERS.map((t) => {
                const ems = t.rewards.filter((r) => r.endsWith("Emblem"));
                return (
                  <tr key={t.tier} className="border-t border-line/60 align-top">
                    <td className="td font-mono text-xs text-gold">{vpLabel(t)}</td>
                    <td className="td">
                      {ems.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ems.map((e) => (
                            <a key={e} href={`#${encodeURIComponent(e)}`} className="chip !py-0.5 hover:border-accent">{e}</a>
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted">None: Lab only from here on</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map(([name, recipes]) => {
          const uses = edgesByEmblem(name);
          const quest = questSources(name);
          return (
            <section key={name} id={name} className="card scroll-mt-20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <MatIcon m={data.materials[RANKUP_MOLD]} size={24} />
                <h2 className="font-semibold text-gold">{name}</h2>
                <span className="ml-auto text-xs text-muted">{recipes[0].success}% success</span>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted">Get it:</span>
                <span className="chip !py-0.5">Lab ({recipes.length} recipe{recipes.length === 1 ? "" : "s"})</span>
                {quest ? (
                  <span className="chip !py-0.5 border-gold/50 text-gold" title={quest.tiers.map((t) => `${vpLabel(t)}: 1 in ${t.size}`).join(" · ")}>
                    Quest reward at {quest.range} · 1 in {quest.per} ({quest.pct}%)
                  </span>
                ) : (
                  <span className="text-muted">Not a quest reward</span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead><tr><th className="th">Ore</th><th className="th">Jewel</th><th className="th">Item</th></tr></thead>
                <tbody>
                  {recipes.map((r, i) => (
                    <tr key={i} className="border-t border-line/60">
                      {[r.ore, r.item1, r.item2].map((n) => (
                        <td key={n} className="td"><MatChip name={n} m={data.materials[n]} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 border-t border-line pt-2">
                <div className="mb-1 text-xs text-muted">Used for {uses.length} rank-up{uses.length === 1 ? "" : "s"}</div>
                <div className="flex flex-wrap gap-1.5">
                  {uses.map((e, i) => {
                    const a = unitById.get(e.from)!, b = unitById.get(e.to)!;
                    return (
                      <Link key={i} href={`/planner?from=${a.slug}&to=${b.slug}`} className="chip hover:border-accent">
                        <UnitImg u={a} size={16} /> {a.name} → <UnitImg u={b} size={16} /> {b.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
