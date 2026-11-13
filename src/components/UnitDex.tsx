"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import type { MaterialLite, Stat, UnitLite } from "@/lib/types";
import { STATS } from "@/lib/types";
import { MatIcon, UnitImg } from "./ui";
import { setUrl, subscribeUrl } from "@/lib/urlState";

type SortKey = "id" | "name" | "rank" | "slots" | Stat | "search";

/** Search power per party slot. Search power is tied to AGI (community guide). */
const searchPower = (u: UnitLite) => u.agi / u.slots;
const sortValue = (u: UnitLite, k: SortKey) => (k === "search" ? searchPower(u) : u[k]);

export default function UnitDex({
  units,
  materials,
}: {
  units: UnitLite[];
  materials: MaterialLite[];
}) {
  // Filters, sort and view live in the URL (?race=…&sort=agi&dir=desc…), so Back returns
  // to the same list and links can be shared. Defaults are left out of the URL.
  const search = useSyncExternalStore(subscribeUrl, () => window.location.search, () => "");
  const p = useMemo(() => new URLSearchParams(search), [search]);
  const q = p.get("q") ?? "";
  const race = p.get("race") ?? "";
  const rank = useMemo<[number, number]>(() => {
    const [a, b] = (p.get("rank") ?? "1-9").split("-").map(Number);
    return [Math.min(Math.max(a || 1, 1), 9), Math.min(Math.max(b || 9, 1), 9)];
  }, [p]);
  const move = p.get("move") ?? "";
  const slots = p.get("slots") ?? "";
  const ability = p.get("ability") ?? "";
  const needs = useMemo(() => (p.get("needs") ? p.get("needs")!.split(",") : []), [p]);
  const needMode: "any" | "all" = p.get("match") === "all" ? "all" : "any";
  const drops = p.get("drops") ?? "";
  const stage = (["base", "final"].includes(p.get("stage") ?? "") ? p.get("stage") : "") as "" | "base" | "final";
  const sort = useMemo<{ key: SortKey; dir: 1 | -1 }>(() => {
    const key = (p.get("sort") ?? "id") as SortKey;
    const valid: SortKey[] = ["id", "name", "rank", "slots", "search", ...STATS];
    return { key: valid.includes(key) ? key : "id", dir: p.get("dir") === "desc" ? -1 : 1 };
  }, [p]);
  const view: "table" | "grid" = p.get("view") === "grid" ? "grid" : "table";

  const setQ = (v: string) => setUrl({ q: v });
  const setRace = (v: string) => setUrl({ race: v });
  const setRank = (f: (r: [number, number]) => [number, number]) => {
    const [a, b] = f(rank);
    setUrl({ rank: a === 1 && b === 9 ? "" : `${a}-${b}` });
  };
  const setMove = (v: string) => setUrl({ move: v });
  const setSlots = (v: string) => setUrl({ slots: v });
  const setAbility = (v: string) => setUrl({ ability: v });
  const setNeeds = (f: (n: string[]) => string[]) => setUrl({ needs: f(needs).join(",") });
  const setNeedMode = (v: "any" | "all") => setUrl({ match: v === "all" ? "all" : "" });
  const setDrops = (v: string) => setUrl({ drops: v });
  const setStage = (v: "" | "base" | "final") => setUrl({ stage: v });
  const setSort = (f: (s: { key: SortKey; dir: 1 | -1 }) => { key: SortKey; dir: 1 | -1 }) => {
    const s = f(sort);
    setUrl({ sort: s.key === "id" ? "" : s.key, dir: s.dir === -1 ? "desc" : "" });
  };
  const setView = (v: "table" | "grid") => setUrl({ view: v === "grid" ? "grid" : "" });
  const [picked, setPicked] = useState<string[]>([]); // unit slugs to compare (max 4)
  const togglePick = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : p.length < 4 ? [...p, slug] : p));

  const dq = useDeferredValue(q);
  const races = useMemo(() => [...new Set(units.map((u) => u.race))].sort(), [units]);
  const abilities = useMemo(
    () => [...new Set(units.map((u) => u.ability).filter(Boolean))].sort(),
    [units],
  );
  // Only materials that are used to evolve something, or dropped by someone
  const needable = useMemo(() => {
    const s = new Set(units.flatMap((u) => u.needs));
    return materials.filter((m) => s.has(m.name));
  }, [units, materials]);
  const droppable = useMemo(() => {
    const s = new Set(units.flatMap((u) => u.drops));
    return materials.filter((m) => s.has(m.name));
  }, [units, materials]);

  const rows = useMemo(() => {
    const ql = dq.trim().toLowerCase();
    const r = units.filter(
      (u) =>
        (!ql || u.name.toLowerCase().includes(ql) || u.race.toLowerCase().includes(ql)) &&
        (!race || u.race === race) &&
        u.rank >= rank[0] &&
        u.rank <= rank[1] &&
        (!move || u.move === move) &&
        (!slots || u.slots === +slots) &&
        (!ability || u.ability === ability) &&
        (!drops || u.drops.includes(drops)) &&
        (!stage || (stage === "base" ? u.prev.length === 0 : u.next.length === 0)) &&
        (needs.length === 0 ||
          (needMode === "any"
            ? needs.some((n) => u.needs.includes(n))
            : needs.every((n) => u.needs.includes(n)))),
    );
    const k = sort.key;
    return r.sort((a, b) => {
      const av = sortValue(a, k), bv = sortValue(b, k);
      return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir || a.id - b.id;
    });
  }, [units, dq, race, rank, move, slots, ability, drops, stage, needs, needMode, sort]);

  const byName = useMemo(() => new Map(materials.map((m) => [m.name, m])), [materials]);
  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "name" || key === "id" ? 1 : -1 }));
  // keeps sort and view, clears every filter
  const reset = () =>
    setUrl({ q: "", race: "", rank: "", move: "", slots: "", ability: "", needs: "", match: "", drops: "", stage: "" });

  const th = (k: SortKey, label: string) => (
    <th
      key={k}
      className="th cursor-pointer select-none whitespace-nowrap hover:text-ink"
      onClick={() => toggleSort(k)}
      title={k === "search" ? "Search party power per party slot: AGI ÷ slots (search power is tied to AGI). Click to sort." : undefined}
    >
      {label}
      {sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Filters */}
      <aside className="card h-fit space-y-3 p-3 lg:sticky lg:top-16">
        <input className="ctl w-full" placeholder="Search name or race…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className="ctl" value={race} onChange={(e) => setRace(e.target.value)} aria-label="Race">
            <option value="">All races</option>
            {races.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className="ctl" value={move} onChange={(e) => setMove(e.target.value)} aria-label="Movement">
            <option value="">Walk + Fly</option>
            <option>Walk</option>
            <option>Fly</option>
          </select>
          <select className="ctl" value={slots} onChange={(e) => setSlots(e.target.value)} aria-label="Slots">
            <option value="">Any slots</option>
            {[1, 2, 3].map((s) => <option key={s} value={s}>{s} slot{s > 1 ? "s" : ""}</option>)}
          </select>
          <select className="ctl" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} aria-label="Stage">
            <option value="">Any stage</option>
            <option value="base">Base units</option>
            <option value="final">Final forms</option>
          </select>
        </div>
        <label className="block text-xs text-muted">
          Rank {rank[0]}–{rank[1]}
          <div className="mt-1 flex gap-2">
            <input type="range" min={1} max={9} value={rank[0]} className="w-full accent-[var(--accent)]"
              onChange={(e) => setRank(([, b]) => [Math.min(+e.target.value, b), b])} />
            <input type="range" min={1} max={9} value={rank[1]} className="w-full accent-[var(--accent)]"
              onChange={(e) => setRank(([a]) => [a, Math.max(+e.target.value, a)])} />
          </div>
        </label>
        <select className="ctl w-full" value={ability} onChange={(e) => setAbility(e.target.value)} aria-label="Ability">
          <option value="">Any ability</option>
          {abilities.map((a) => <option key={a}>{a}</option>)}
        </select>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Material needed to evolve <b>into</b> unit</span>
            <button className="underline" onClick={() => setNeedMode(needMode === "any" ? "all" : "any")}>
              match {needMode}
            </button>
          </div>
          <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
            {needable.map((m) => {
              const on = needs.includes(m.name);
              return (
                <button
                  key={m.name}
                  onClick={() => setNeeds((n) => (on ? n.filter((x) => x !== m.name) : [...n, m.name]))}
                  className={`chip ${on ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}
                >
                  <MatIcon m={m} size={14} />
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
        <select className="ctl w-full" value={drops} onChange={(e) => setDrops(e.target.value)} aria-label="Drops material">
          <option value="">Drops any material</option>
          {droppable.map((m) => <option key={m.name} value={m.name}>Drops {m.name}</option>)}
        </select>
        <button className="text-xs text-muted underline" onClick={reset}>Reset filters</button>
      </aside>

      {/* Results */}
      <section className="min-w-0">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">{rows.length} of {units.length} units</span>
          <div className="flex overflow-hidden rounded-md border border-line">
            {(["table", "grid"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 capitalize ${view === v ? "bg-accent text-accent-ink" : "bg-panel"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {view === "grid" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`/unit/${u.slug}`} className="card flex flex-col items-center gap-1 p-3 text-center hover:border-accent">
                  <UnitImg u={u} size={64} />
                  <span className="font-mono text-[10px] text-muted">#{String(u.id + 1).padStart(3, "0")}</span>
                  <span className="text-sm font-medium leading-tight">{u.name}</span>
                  <span className="text-[11px] text-muted">{u.race} · R{u.rank} · {u.move}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-panel-2">
                <tr>
                  <th className="th w-8" title="Tick up to 4 units to compare">⇄</th>
                  {th("id", "#")}
                  {th("name", "Unit")}
                  <th className="th">Race</th>
                  {th("rank", "Rank")}
                  {th("slots", "Slots")}
                  {STATS.map((s) => th(s, s === "hit" ? "Hit%" : s.toUpperCase()))}
                  {th("search", "Search")}
                  <th className="th">Ability</th>
                  <th className="th">Evolves into</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className={`border-b border-line/60 last:border-0 hover:bg-panel-2/60 ${picked.includes(u.slug) ? "bg-accent/10" : ""}`}>
                    <td className="td">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={picked.includes(u.slug)}
                        disabled={!picked.includes(u.slug) && picked.length >= 4}
                        onChange={() => togglePick(u.slug)}
                        aria-label={`Compare ${u.name}`}
                      />
                    </td>
                    <td className="td font-mono text-xs text-muted">{String(u.id + 1).padStart(3, "0")}</td>
                    <td className="td">
                      <Link href={`/unit/${u.slug}`} className="flex items-center gap-2 font-medium hover:text-accent">
                        <UnitImg u={u} size={32} />
                        <span className="whitespace-nowrap">{u.name}</span>
                        {u.move === "Fly" && <span className="chip !px-1.5 text-[10px]">Fly</span>}
                      </Link>
                    </td>
                    <td className="td whitespace-nowrap text-muted">{u.race}</td>
                    <td className="td font-mono">{u.rank}</td>
                    <td className="td font-mono">{u.slots}</td>
                    {STATS.map((s) => <td key={s} className="td text-right font-mono tabular-nums">{u[s]}</td>)}
                    <td
                      className="td text-right font-mono tabular-nums"
                      title={`Search power ≈ AGI ${u.agi} ÷ ${u.slots} slot${u.slots > 1 ? "s" : ""}`}
                    >
                      <span className={searchPower(u) >= 40 ? "font-semibold text-accent" : searchPower(u) >= 30 ? "text-gold" : ""}>
                        {Number.isInteger(searchPower(u)) ? searchPower(u) : searchPower(u).toFixed(1)}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap text-muted">{u.ability || "—"}</td>
                    <td className="td">
                      <div className="flex gap-1">
                        {u.next.length === 0 && <span className="text-xs text-muted">final</span>}
                        {u.next.map((id) => {
                          const n = units.find((x) => x.id === id)!;
                          return (
                            <Link key={id} href={`/unit/${n.slug}`} title={n.name}>
                              <UnitImg u={n} size={24} />
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {needs.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Showing units whose evolution emblem can be made with {needMode === "any" ? "any" : "all"} of:{" "}
            {needs.map((n) => byName.get(n)?.name ?? n).join(", ")}. Open a unit for exact recipes.
          </p>
        )}
      </section>

      {/* compare tray */}
      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="card flex items-center gap-3 px-3 py-2 shadow-lg">
            <div className="flex -space-x-1.5">
              {picked.map((s) => {
                const u = units.find((x) => x.slug === s)!;
                return (
                  <button key={s} onClick={() => togglePick(s)} title={`Remove ${u.name}`}>
                    <UnitImg u={u} size={32} />
                  </button>
                );
              })}
            </div>
            <span className="text-sm text-muted">{picked.length}/4</span>
            <Link
              href={`/compare?u=${picked.join(",")}`}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${picked.length >= 2 ? "bg-accent text-accent-ink" : "bg-panel-2 text-muted"}`}
            >
              Compare{picked.length < 2 ? " (pick 2+)" : ""}
            </Link>
            <button className="text-xs text-muted underline" onClick={() => setPicked([])}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
