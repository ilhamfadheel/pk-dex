"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { MaterialLite, Stat, UnitLite } from "@/lib/types";
import { STATS } from "@/lib/types";
import { MatIcon, UnitImg } from "./ui";

type SortKey = "id" | "name" | "rank" | "slots" | Stat;

export default function UnitDex({
  units,
  materials,
}: {
  units: UnitLite[];
  materials: MaterialLite[];
}) {
  const [q, setQ] = useState("");
  const [race, setRace] = useState("");
  const [rank, setRank] = useState<[number, number]>([1, 9]);
  const [move, setMove] = useState("");
  const [slots, setSlots] = useState("");
  const [ability, setAbility] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [needMode, setNeedMode] = useState<"any" | "all">("any");
  const [drops, setDrops] = useState("");
  const [stage, setStage] = useState<"" | "base" | "final">("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: 1 });
  const [view, setView] = useState<"table" | "grid">("table");

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
      const av = a[k], bv = b[k];
      return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir || a.id - b.id;
    });
  }, [units, dq, race, rank, move, slots, ability, drops, stage, needs, needMode, sort]);

  const byName = useMemo(() => new Map(materials.map((m) => [m.name, m])), [materials]);
  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "name" || key === "id" ? 1 : -1 }));
  const reset = () => {
    setQ(""); setRace(""); setRank([1, 9]); setMove(""); setSlots(""); setAbility("");
    setNeeds([]); setDrops(""); setStage("");
  };

  const th = (k: SortKey, label: string) => (
    <th key={k} className="th cursor-pointer select-none whitespace-nowrap hover:text-ink" onClick={() => toggleSort(k)}>
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
                  {th("id", "#")}
                  {th("name", "Unit")}
                  <th className="th">Race</th>
                  {th("rank", "Rank")}
                  {th("slots", "Slots")}
                  {STATS.map((s) => th(s, s === "hit" ? "Hit%" : s.toUpperCase()))}
                  <th className="th">Ability</th>
                  <th className="th">Evolves into</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-panel-2/60">
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
    </div>
  );
}
