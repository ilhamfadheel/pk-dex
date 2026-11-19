import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { UnitImg } from "@/components/ui";
import { cities, crafting, data, equipment, rawMaterials, unitSoldIn } from "@/lib/data";
import { areas } from "@/lib/world";
import { GAME, SITE_NAME, abs, pageMeta } from "@/lib/seo";

const units = data.units.length;
const races = new Set(data.units.map((u) => u.race)).size;
const emblems = Object.keys(data.emblems).length;
const emblemRecipes = Object.values(data.emblems).reduce((n, r) => n + r.length, 0);
const maxVp = Math.max(...areas.map((a) => a.vp));
const shopUnits = data.units.filter((u) => unitSoldIn.get(u.name)?.length);
const finals = data.units.filter((u) => u.rank === 9);

export const metadata: Metadata = pageMeta({
  title: `${GAME} – Guide, Unit Database & Tools`,
  absoluteTitle: true,
  description: `${GAME} is SEGA's 2004 kingdom-building RPG for the Nokia N-Gage. This fan guide covers all ${units} units, rank-ups and emblems, the world map of Ulgress, equipment, a party builder and a battle simulator.`,
  path: "/",
});

const FAQ: { q: string; a: string }[] = [
  {
    q: `What is ${GAME}?`,
    a: `${GAME} is a role-playing strategy game released by SEGA for the Nokia N-Gage in 2004. You rule a kingdom on the Map of Ulgress, recruit units, rank them up into stronger forms, send parties to fight and search areas, and can play online against other kingdoms through N-Gage Arena.`,
  },
  {
    q: "How many units are there?",
    a: `There are ${units} units across ${races} races and 9 ranks. ${shopUnits.length} starting units are sold in city shops; every other unit is reached by ranking up, ending in ${finals.length} rank 9 units.`,
  },
  {
    q: "How do you rank up a unit?",
    a: `A unit ranks up when it reaches the level its next form needs, your kingdom has enough Victory Points (VP), and you use the right emblem. Emblems are made in the Lab from a RankUp Mold, an ore, a jewel and an item; there are ${emblems} emblems with ${emblemRecipes} recipes.`,
  },
  {
    q: "How do you unlock new areas?",
    a: `The world has ${areas.length} areas in 9 regions. An area opens when you have beaten the boss of the areas it depends on and your kingdom has the VP it asks for (up to ${maxVp}).`,
  },
  {
    q: "How big can a party be?",
    a: "A party holds up to 4 units, and their slots (1 to 3 each) can add up to at most 6.",
  },
  {
    q: "Where do emblems and rare jewels come from?",
    a: "Emblems are made in the Lab, and townsfolk sometimes give one as a quest reward depending on your VP. Ores, jewels and other materials come from shops, area searches, dungeons and enemy drops; some finds are only listed for online searches.",
  },
];

const SECTIONS: { href: string; title: string; text: string; stat: string }[] = [
  { href: "/units", title: "Units", text: "Stats, abilities, portraits and battle animations for every unit, with filters for race, rank and materials.", stat: `${units} units` },
  { href: "/planner", title: "Rank-up planner", text: "Pick a unit to see every route to it and the total materials, levels and VP it takes.", stat: `${data.edges.length} rank-ups` },
  { href: "/emblems", title: "Emblems", text: "Every rank-up emblem, its Lab recipes and which quests can reward it.", stat: `${emblems} emblems` },
  { href: "/materials", title: "Materials", text: "Ores, jewels and items: shops, area searches, dungeon rewards and enemy drops.", stat: `${rawMaterials.length} materials` },
  { href: "/equipment", title: "Equipment", text: "Weapons, armor and accessories with tiers, bonuses and effects.", stat: `${equipment.length} items` },
  { href: "/crafting", title: "Crafting", text: "Lab recipes for named weapons, armor and accessories and what their effects do in battle.", stat: `${crafting.length} recipes` },
  { href: "/cities", title: "Cities & world map", text: "Each area's shop, enemies, searches and dungeons, plus the bosses you must beat to open it.", stat: `${cities.length} areas` },
  { href: "/party", title: "Party builder", text: "Build a party and watch it fight any area's enemy parties on the game's own battlefields.", stat: "Battle simulator" },
  { href: "/compare", title: "Compare", text: "Put up to 4 units side by side.", stat: "Side by side" },
];

const HOW: { title: string; text: string }[] = [
  { title: "Build an army", text: `Buy one of ${shopUnits.length} starting units in a city shop, level it in battle, then rank it up along branching paths through ${races} races to one of ${finals.length} rank 9 units.` },
  { title: "Craft in the Lab", text: "Combine molds, ores, jewels and items into rank-up emblems, weapons, armor and accessories. Each recipe has its own success rate, and equipment can carry battle effects." },
  { title: "Conquer Ulgress", text: `Win battles to earn Victory Points, beat area bosses to open new paths, and work across ${areas.length} areas from Elynotis to the Mountaintop Shrine.` },
  { title: "Send out parties", text: "Parties of up to 4 units (6 slots) fight in real time: units walk in, attack when in reach and act faster with higher AGI. Parties can also search an area for materials." },
];

const STATS: [number, string][] = [[units, "units"], [emblems, "emblems"], [equipment.length, "equipment"], [areas.length, "areas"]];

export default function Home() {
  return (
    <div className="space-y-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: GAME,
          alternateName: "Pocket Kingdom",
          gamePlatform: "Nokia N-Gage",
          genre: ["Role-playing", "Strategy"],
          datePublished: "2004",
          publisher: { "@type": "Organization", name: "SEGA" },
          description: FAQ[0].a,
          url: abs("/"),
          image: abs("/og/site.png"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <section className="card overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">SEGA · Nokia N-Gage · 2004</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{GAME}</h1>
            <p className="mt-4 max-w-xl text-muted">
              The complete fan guide and database: every unit, rank-up, emblem, material and area, read from the
              game&apos;s own files, with a rank-up planner, a party builder and a battle simulator.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/units" className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink hover:opacity-90">
                Browse all {units} units
              </Link>
              <Link href="/planner" className="rounded-lg border border-line px-4 py-2 font-semibold hover:border-accent">Plan a rank-up</Link>
              <Link href="/cities" className="rounded-lg border border-line px-4 py-2 font-semibold hover:border-accent">World map</Link>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-4 gap-3 text-center">
              {STATS.map(([n, l]) => (
                <div key={l} className="flex flex-col rounded-lg bg-panel-2 p-2">
                  <dt className="order-2 text-[10px] font-semibold uppercase text-muted">{l}</dt>
                  <dd className="font-mono text-xl font-bold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-4 content-center gap-2 sm:grid-cols-5">
            {finals.slice(0, 20).map((u) => (
              <Link
                key={u.id}
                href={`/unit/${u.slug}`}
                title={u.name}
                className="grid place-items-center rounded-lg bg-panel-2 p-1.5 hover:ring-2 hover:ring-accent"
              >
                <UnitImg u={u} size={52} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">What is {GAME}?</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-muted">
          <p>
            <strong className="text-ink">{GAME}</strong> is a role-playing strategy game released by SEGA for the
            Nokia N-Gage in 2004. You are the ruler of a small kingdom on the Map of Ulgress. You recruit units, train
            them in battle, rank them up into stronger forms and send parties across the map to fight, search for
            materials and beat the boss of each area.
          </p>
          <p>
            The game can be played alone or online through N-Gage Arena, where kingdoms fight each other for Victory
            Points and trade items in a global auction. {SITE_NAME} documents the single-player side in full, using
            data read straight from the game&apos;s own files.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">How the game works</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {HOW.map((h, i) => (
            <div key={h.title} className="card p-4">
              <div className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="mt-1 font-semibold">{h.title}</h3>
              <p className="mt-1 text-sm text-muted">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Explore the guide</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="card group p-4 hover:border-accent">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold group-hover:text-accent">{s.title}</h3>
                <span className="font-mono text-[11px] text-gold">{s.stat}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Starting units</h2>
        <p className="mt-1 text-sm text-muted">
          The {shopUnits.length} units sold in city shops. Every other unit ranks up from one of these.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {shopUnits.map((u) => (
            <Link
              key={u.id}
              href={`/unit/${u.slug}`}
              className="card flex w-28 flex-col items-center gap-1 p-3 text-center text-sm hover:border-accent"
            >
              <UnitImg u={u} size={52} />
              <span className="font-medium leading-tight">{u.name}</span>
              <span className="text-[11px] text-muted">{u.race}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="card p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
