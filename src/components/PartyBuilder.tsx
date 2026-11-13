"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { UnitLite } from "@/lib/types";
import { setUrl, subscribeUrl } from "@/lib/urlState";
import { winRate } from "@/lib/battle";
import BattleView from "./BattleView";
import type { AnimData } from "./SpritePlayer";
import { UnitImg } from "./ui";

/**
 * A party holds at most 4 units, and their slots (1-3 each) can add up to at most 6.
 * The game's party table has 4 unit places per party, and every regular enemy party
 * fits in 6 slots (the only bigger one is a boss party).
 */
export const PARTY_UNITS = 4;
export const PARTY_SLOTS = 6;

export interface AreaFoes {
  city: string;
  slug: string;
  vp: number;
  bg: string; // battle backdrop name
  parties: number[][]; // unit ids
}

function totals(us: UnitLite[], price: (u: UnitLite) => number) {
  const sum = (k: "hp" | "atk" | "def" | "agi" | "dex" | "wis" | "int") => us.reduce((s, u) => s + u[k], 0);
  return {
    hp: sum("hp"),
    atk: sum("atk"),
    def: sum("def"),
    agi: sum("agi"),
    dex: sum("dex"),
    wis: sum("wis"),
    int: sum("int"),
    hit: us.length ? Math.round(us.reduce((s, u) => s + u.hit, 0) / us.length) : 0,
    slots: us.reduce((s, u) => s + u.slots, 0),
    price: us.reduce((s, u) => s + price(u), 0),
    maxRank: Math.max(0, ...us.map((u) => u.rank)),
  };
}
/** Verdict from the simulated win rate. */
function verdict(rate: number) {
  if (rate >= 0.7) return { label: "Favored", cls: "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" };
  if (rate >= 0.4) return { label: "Even", cls: "border-gold/50 bg-gold/15 text-gold" };
  return { label: "Risky", cls: "border-red-500/50 bg-red-500/15 text-red-400" };
}

const STAT_ROWS = [
  ["hp", "HP"],
  ["atk", "ATK"],
  ["def", "DEF"],
  ["agi", "AGI"],
  ["dex", "DEX"],
  ["wis", "WIS"],
  ["int", "INT"],
] as const;

export default function PartyBuilder({
  units,
  prices,
  soldIn,
  areas,
  anims,
}: {
  anims: Record<string, AnimData>;
  units: UnitLite[];
  prices: Record<string, number>;
  soldIn: Record<string, string[]>;
  areas: AreaFoes[];
}) {
  const search = useSyncExternalStore(subscribeUrl, () => window.location.search, () => "");
  const p = useMemo(() => new URLSearchParams(search), [search]);
  const bySlug = useMemo(() => new Map(units.map((u) => [u.slug, u])), [units]);
  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const price = (u: UnitLite) => prices[u.name] ?? 0;

  // ?u=soldier,soldier,archer&vs=elynotis (repeats allowed: a party can hold two Soldiers)
  const party = useMemo(
    () => {
      const out: UnitLite[] = [];
      for (const s of (p.get("u") ?? "").split(",")) {
        const u = bySlug.get(s);
        if (u && out.length < PARTY_UNITS && out.reduce((n, x) => n + x.slots, u.slots) <= PARTY_SLOTS) out.push(u);
      }
      return out;
    },
    [p, bySlug],
  );
  const vs = areas.find((a) => a.slug === p.get("vs")) ?? null;
  const shopOnly = p.get("shop") === "1";
  const setParty = (list: UnitLite[]) => setUrl({ u: list.map((u) => u.slug).join(",") });

  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim().toLowerCase());
  const pickable = useMemo(
    () =>
      units
        .filter((u) => !shopOnly || soldIn[u.name]?.length)
        .filter((u) => !dq || `${u.name} ${u.race} ${u.ability}`.toLowerCase().includes(dq))
        .sort((a, b) => a.rank - b.rank || a.id - b.id),
    [units, shopOnly, soldIn, dq],
  );

  const mine = totals(party, price);
  const foeTotals = (ids: number[]) => totals(ids.map((id) => byId.get(id)!), price);

  const foesOf = useMemo(() => (ids: number[]) => ids.map((id) => byId.get(id)!), [byId]);
  const [fight, setFight] = useState<number | null>(null); // enemy party index in the chosen area

  // Simulated win rate against each of the chosen area's parties.
  const vsOdds = useMemo(
    () => (vs && party.length ? vs.parties.map((ids) => winRate(party, foesOf(ids), 40, 7)) : []),
    [vs, party, foesOf],
  );
  // How the party fares in every area (fewer runs; deferred so clicks stay snappy).
  // Computed a few areas at a time in the background so the page stays responsive.
  type Outlook = { a: AreaFoes; wins: number; risky: number; n: number };
  const partyKey = party.map((u) => u.slug).join(",");
  const [outlookState, setOutlookState] = useState<{ key: string; rows: Outlook[] }>({ key: "", rows: [] });
  useEffect(() => {
    if (!party.length) return;
    const order = [...areas].sort((x, y) => x.vp - y.vp || x.city.localeCompare(y.city));
    const rows: Outlook[] = [];
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      for (const a of order.slice(i, i + 3)) {
        const rates = a.parties.filter((x) => x.length).map((x) => winRate(party, foesOf(x), 8, 3).rate);
        rows.push({ a, wins: rates.filter((r) => r >= 0.7).length, risky: rates.filter((r) => r < 0.4).length, n: rates.length });
      }
      i += 3;
      setOutlookState({ key: partyKey, rows: [...rows] });
      if (i < order.length) timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partyKey identifies the party
  }, [partyKey, areas, foesOf]);
  const outlook = outlookState.key === partyKey ? outlookState.rows : [];

  const free = PARTY_SLOTS - mine.slots;
  const blocked = (u: UnitLite) =>
    party.length >= PARTY_UNITS
      ? `The party is full (${PARTY_UNITS} units)`
      : u.slots > free
        ? `${u.name} needs ${u.slots} slot${u.slots > 1 ? "s" : ""}; ${free} of ${PARTY_SLOTS} left`
        : null;

  return (
    <div className="space-y-4">
      {/* Party */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Your party</h2>
          <span className="text-xs text-muted">
            {party.length}/{PARTY_UNITS} units · {mine.slots}/{PARTY_SLOTS} slots · the link keeps this party
          </span>
          {party.length > 0 && (
            <>
              <Link href={`/compare?u=${[...new Set(party.map((u) => u.slug))].join(",")}`} className="chip ml-auto !py-1 !text-xs hover:border-accent">
                ⇄ Compare these
              </Link>
              <button className="text-xs text-muted underline" onClick={() => setParty([])}>Clear</button>
            </>
          )}
        </div>
        {/* slot meter: 6 cells, coloured per unit */}
        <div className="mb-3 flex items-center gap-2" aria-label={`${mine.slots} of ${PARTY_SLOTS} slots used`}>
          <span className="text-[10px] font-semibold uppercase text-muted">Slots</span>
          <div className="flex flex-1 gap-1">
            {party.flatMap((u, i) =>
              Array.from({ length: u.slots }, (_, j) => (
                <span key={`${i}-${j}`} title={u.name} className={`h-2.5 flex-1 rounded-sm ${i % 2 ? "bg-accent/60" : "bg-accent"}`} />
              )),
            )}
            {Array.from({ length: free }, (_, i) => <span key={`f${i}`} className="h-2.5 flex-1 rounded-sm bg-panel-2" />)}
          </div>
          <span className="font-mono text-xs tabular-nums">{mine.slots}/{PARTY_SLOTS}</span>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: PARTY_UNITS }, (_, i) => {
            const u = party[i];
            return (
              <li
                key={i}
                className={`relative flex min-h-36 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center ${u ? "border-line bg-panel-2" : "border-dashed border-line text-muted"}`}>
                {u && <span className="absolute top-1 left-2 font-mono text-[10px] text-muted">{u.slots} slot{u.slots > 1 ? "s" : ""}</span>}
                {u ? (
                  <>
                    <button
                      onClick={() => setParty(party.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink"
                      aria-label={`Remove ${u.name}`}
                      title="Remove"
                    >
                      ×
                    </button>
                    <Link href={`/unit/${u.slug}`} className="flex flex-col items-center gap-1 hover:text-accent">
                      <UnitImg u={u} size={56} />
                      <span className="text-sm font-medium leading-tight">{u.name}</span>
                    </Link>
                    <span className="text-[11px] text-muted">
                      R{u.rank} · {price(u)} G
                    </span>
                    {u.ability && <span className="chip !px-1.5 !py-0 !text-[10px]">{u.ability}</span>}
                  </>
                ) : (
                  <span className="text-xs">{free > 0 ? "Empty: pick a unit below" : "No slots left"}</span>
                )}
              </li>
            );
          })}
        </ol>

        {party.length > 0 && (
          <div className="mt-4 grid items-start gap-4 md:grid-cols-[1fr_auto]">
            <dl className="grid grid-cols-4 gap-2 text-center sm:grid-cols-7">
              {STAT_ROWS.map(([k, label]) => (
                <div key={k} className="rounded-md bg-panel-2 p-2">
                  <dt className="text-[10px] font-semibold uppercase text-muted">{label}</dt>
                  <dd className="font-mono text-lg tabular-nums">{mine[k]}</dd>
                </div>
              ))}
            </dl>
            <dl className="grid grid-cols-3 gap-2 text-center md:grid-cols-1 md:text-left">
              <div className="rounded-md bg-panel-2 p-2" title="Sum of each unit's price in the game's unit table">
                <dt className="text-[10px] font-semibold uppercase text-muted">Price</dt>
                <dd className="font-mono text-lg tabular-nums text-gold">{mine.price.toLocaleString()} G</dd>
              </div>
              <div className="rounded-md bg-panel-2 p-2" title="Search power is tied to AGI: the party's total AGI">
                <dt className="text-[10px] font-semibold uppercase text-muted">Search (AGI)</dt>
                <dd className="font-mono text-lg tabular-nums">{mine.agi}</dd>
              </div>
              <div className="rounded-md bg-panel-2 p-2">
                <dt className="text-[10px] font-semibold uppercase text-muted">Avg hit %</dt>
                <dd className="font-mono text-lg tabular-nums">{mine.hit}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {/* Picker */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Add units</h2>
          <input
            className="ctl min-w-48 flex-1"
            placeholder="Filter by name, race or ability…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter units"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={shopOnly} onChange={(e) => setUrl({ shop: e.target.checked ? "1" : "" })} />
            Shop units only
          </label>
        </div>
        <ul className="grid max-h-[420px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5 overflow-y-auto pr-1">
          {pickable.map((u) => (
            <li key={u.id}>
              <button
                disabled={!!blocked(u)}
                onClick={() => setParty([...party, u])}
                className="flex w-full items-center gap-2 rounded-lg border border-line p-1.5 text-left text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                title={blocked(u) ?? `Add ${u.name} (${u.slots} slot${u.slots > 1 ? "s" : ""})`}
              >
                <UnitImg u={u} size={36} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="block text-[11px] text-muted">R{u.rank} · {u.slots}s · {price(u)} G</span>
                </span>
              </button>
            </li>
          ))}
          {!pickable.length && <li className="col-span-full p-4 text-center text-sm text-muted">No units match.</li>}
        </ul>
      </section>

      {/* Match-up */}
      <section id="party-vs" className="card scroll-mt-20 p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Match-up against an area</h2>
          <select
            className="ctl ml-auto"
            value={vs?.slug ?? ""}
            onChange={(e) => { setFight(null); setUrl({ vs: e.target.value }); }}
            aria-label="Area to fight in"
          >
            <option value="">Pick an area…</option>
            {[...areas].sort((a, b) => a.vp - b.vp || a.city.localeCompare(b.city)).map((a) => (
              <option key={a.slug} value={a.slug}>{a.city} ({a.vp} VP)</option>
            ))}
          </select>
        </div>
        <p className="mb-3 text-xs text-muted">
          Each enemy party the area can send, with your win rate from 40 simulated battles. Press Fight to watch one
          play out.
        </p>

        {vs && fight != null && party.length > 0 && (
          <div className="mb-3">
            <BattleView
              key={`${vs.slug}-${fight}-${party.map((u) => u.slug).join(",")}`}
              party={party}
              foes={foesOf(vs.parties[fight])}
              title={`${vs.city}, party ${fight + 1}`}
              bg={vs.bg}
              anims={anims}
              onClose={() => setFight(null)}
            />
          </div>
        )}

        {vs ? (
          <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {vs.parties.map((ids, i) => {
              const t = foeTotals(ids);
              const o = vsOdds[i];
              const v = verdict(o?.rate ?? 0);
              return (
                <li key={i} className={`rounded-lg border p-2 ${fight === i ? "border-accent" : "border-line"}`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted">Party {i + 1}</span>
                    {o && (
                      <>
                        <span className={`ml-auto rounded border px-1.5 text-[11px] font-semibold ${v.cls}`} title={`Won ${o.wins}, lost ${o.losses}${o.draws ? `, ${o.draws} ran out of time` : ""} of ${o.runs} simulated battles`}>
                          {v.label} · {Math.round(o.rate * 100)}%
                        </span>
                        <button
                          onClick={() => { setFight(i); document.getElementById("party-vs")?.scrollIntoView({ behavior: "smooth" }); }}
                          className="chip !px-2 !py-0.5 !text-[11px] hover:border-accent"
                        >
                          ⚔ Fight
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ids.map((id, j) => {
                      const u = byId.get(id)!;
                      return (
                        <Link key={j} href={`/unit/${u.slug}`} title={`${u.name} (rank ${u.rank})`}>
                          <UnitImg u={u} size={32} />
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 font-mono text-[11px] tabular-nums">
                    {(["hp", "atk", "def", "agi"] as const).map((k) => (
                      <span key={k} className={party.length && mine[k] >= t[k] ? "text-accent" : "text-muted"}>
                        {k.toUpperCase()} {t[k]}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted">Pick an area to see its 9 enemy parties next to yours.</p>
        )}
      </section>

      {/* Where to fight */}
      {party.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold">Where this party can fight</h2>
          <p className="mb-3 text-xs text-muted">
            Every area by VP: in simulated battles, how many of its enemy parties yours usually beats (70%+) and how
            many it usually loses to (under 40%). Click one to see the match-ups.
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {outlook.map(({ a, wins, risky, n }) => {
              const tone = risky === 0 && wins === n ? "border-emerald-500/50" : risky > n / 2 ? "border-red-500/40 opacity-70" : "border-line";
              return (
                <li key={a.slug}>
                  <button
                    onClick={() => {
                      setFight(null);
                      setUrl({ vs: a.slug });
                      document.getElementById("party-vs")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm hover:border-accent ${tone} ${vs?.slug === a.slug ? "bg-panel-2" : ""}`}
                  >
                    <span className="font-medium">{a.city}</span>
                    <span className="font-mono text-[10px] text-gold">{a.vp} VP</span>
                    <span className="ml-auto flex gap-1 font-mono text-[11px]">
                      <span className="text-emerald-400" title="Favored match-ups">{wins}✓</span>
                      <span className="text-red-400" title="Risky match-ups">{risky}✗</span>
                      <span className="text-muted">/{n}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
