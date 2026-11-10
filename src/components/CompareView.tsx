"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { battles, pathsFromBases, vpNeeded } from "@/lib/plan";
import { STATS, type PlannerData, type Stat, type UnitLite } from "@/lib/types";
import { UnitImg } from "./ui";

const MAX = 4;
const STAT_LABEL: Record<Stat, string> = { hp: "HP", atk: "ATK", def: "DEF", agi: "AGI", dex: "DEX", wis: "WIS", int: "INT", hit: "Hit %" };

function CompareRow({ cols, label, cells, hl }: { cols: string; label: string; cells: React.ReactNode[]; hl?: Set<number> }) {
  return (
    <div className="grid border-b border-line/60 last:border-0" style={{ gridTemplateColumns: cols }}>
      <div className="th flex items-center">{label}</div>
      {cells.map((c, i) => (
        <div key={i} className={`td flex items-center ${hl?.has(i) ? "bg-accent/15 font-semibold text-accent" : ""}`}>{c}</div>
      ))}
    </div>
  );
}

export default function CompareView({ data }: { data: PlannerData }) {
  const sp = useSearchParams();
  const router = useRouter();
  const bySlug = useMemo(() => new Map(data.units.map((u) => [u.slug, u])), [data.units]);
  const byId = useMemo(() => new Map(data.units.map((u) => [u.id, u])), [data.units]);
  const units = (sp.get("u") ?? "")
    .split(",")
    .map((s) => bySlug.get(s))
    .filter((u, i, a): u is UnitLite => !!u && a.findIndex((x) => x?.id === u.id) === i)
    .slice(0, MAX);
  const [pick, setPick] = useState("");

  const setUnits = (list: UnitLite[]) => {
    const q = list.map((u) => u.slug).join(",");
    router.replace(q ? `/compare?u=${q}` : "/compare", { scroll: false });
  };
  const add = (name: string) => {
    const u = data.units.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    if (u && !units.some((x) => x.id === u.id) && units.length < MAX) setUnits([...units, u]);
    setPick("");
  };

  // Cheapest route from a Shop (base) unit: fewest battles.
  const route = (u: UnitLite) => {
    if (u.prev.length === 0) return null;
    const best = pathsFromBases(data, u.id).sort((a, b) => battles(a) - battles(b) || a.length - b.length)[0];
    return best ? { from: byId.get(best[0].from)!, steps: best.length, battles: battles(best), vp: vpNeeded(best) } : null;
  };
  const routes = units.map(route);
  const total = (u: UnitLite) => u.hp + u.atk + u.def + u.agi + u.dex + u.wis + u.int;
  const statMax: Record<Stat, number> = { hp: 260, atk: 100, def: 75, agi: 85, dex: 100, wis: 100, int: 100, hit: 80 };

  // highlight best (max) per numeric row when comparing 2+
  const best = (vals: number[], low = false) => {
    if (units.length < 2) return new Set<number>();
    const target = low ? Math.min(...vals) : Math.max(...vals);
    return vals.every((v) => v === target) ? new Set<number>() : new Set(vals.flatMap((v, i) => (v === target ? [i] : [])));
  };

  const cols = `minmax(110px,150px) repeat(${Math.max(units.length, 1)}, minmax(150px, 1fr))`;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input
          className="ctl min-w-56 flex-1"
          list="compare-units"
          placeholder={units.length >= MAX ? `Up to ${MAX} units` : "Add a unit… (type a name)"}
          disabled={units.length >= MAX}
          value={pick}
          onChange={(e) => {
            setPick(e.target.value);
            if (data.units.some((u) => u.name === e.target.value)) add(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && add(pick)}
          aria-label="Add a unit to compare"
        />
        <datalist id="compare-units">
          {data.units.filter((u) => !units.some((x) => x.id === u.id)).map((u) => <option key={u.id} value={u.name} />)}
        </datalist>
        {units.length > 0 && (
          <button className="text-xs text-muted underline" onClick={() => setUnits([])}>Clear all</button>
        )}
        <span className="ml-auto text-xs text-muted">{units.length}/{MAX} units · the link keeps this comparison</span>
      </div>

      {units.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">
          Add units above, tick them in the <Link href="/" className="underline">unit list</Link>, or use Compare on any unit page.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <div className="min-w-fit">
            {/* header */}
            <div className="grid border-b border-line bg-panel-2" style={{ gridTemplateColumns: cols }}>
              <div />
              {units.map((u) => (
                <div key={u.id} className="relative flex flex-col items-center gap-1 p-3 text-center">
                  <button
                    onClick={() => setUnits(units.filter((x) => x.id !== u.id))}
                    className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink"
                    aria-label={`Remove ${u.name}`}
                    title="Remove"
                  >
                    ×
                  </button>
                  <Link href={`/unit/${u.slug}`} className="flex flex-col items-center gap-1 hover:text-accent">
                    <UnitImg u={u} size={72} />
                    <span className="font-semibold">{u.name}</span>
                  </Link>
                </div>
              ))}
            </div>

            <CompareRow cols={cols} label="Race" cells={units.map((u) => (
              <span key={u.id} className="inline-flex items-center gap-1.5">
                {u.raceImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.raceImg} alt="" width={16} height={16} className="pixel" />
                )}
                {u.race}
              </span>
            ))} />
            <CompareRow cols={cols} label="Rank" cells={units.map((u) => u.rank)} hl={best(units.map((u) => u.rank))} />
            <CompareRow cols={cols} label="Slots" cells={units.map((u) => `${u.slots} slot${u.slots > 1 ? "s" : ""}`)} />
            <CompareRow cols={cols} label="Move" cells={units.map((u) => u.move)} />
            <CompareRow cols={cols} label="Ability" cells={units.map((u) => u.ability || "—")} />
            {STATS.map((s) => (
              <CompareRow cols={cols}
                key={s}
                label={STAT_LABEL[s]}
                hl={best(units.map((u) => u[s]))}
                cells={units.map((u) => (
                  <span key={u.id} className="flex w-full items-center gap-2">
                    <span className="w-8 text-right font-mono tabular-nums">{u[s]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (u[s] / statMax[s]) * 100)}%` }} />
                    </span>
                  </span>
                ))}
              />
            ))}
            <CompareRow cols={cols} label="Stat total" hl={best(units.map(total))} cells={units.map((u) => <span key={u.id} className="font-mono">{total(u)}</span>)} />
            <CompareRow cols={cols}
              label="Get it from"
              cells={routes.map((r, i) => (r ? (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <UnitImg u={r.from} size={22} /> {r.from.name}
                </span>
              ) : <span key={i}>Shop (buy directly)</span>))}
            />
            <CompareRow cols={cols} label="Rank-ups needed" hl={best(routes.map((r) => r?.steps ?? 0), true)} cells={routes.map((r) => r?.steps ?? 0)} />
            <CompareRow cols={cols} label="Battles needed" hl={best(routes.map((r) => r?.battles ?? 0), true)} cells={routes.map((r) => r?.battles ?? 0)} />
            <CompareRow cols={cols} label="Kingdom VP" hl={best(routes.map((r) => r?.vp ?? 0), true)} cells={routes.map((r) => r?.vp ?? 0)} />
            <CompareRow cols={cols}
              label="Evolves into"
              cells={units.map((u) => (
                <span key={u.id} className="flex flex-wrap gap-1">
                  {u.next.length === 0 ? <span className="text-muted">Final form</span> : u.next.map((id) => {
                    const n = byId.get(id)!;
                    return <Link key={id} href={`/unit/${n.slug}`} title={n.name}><UnitImg u={n} size={26} /></Link>;
                  })}
                </span>
              ))}
            />
            <CompareRow cols={cols}
              label="Plan"
              cells={units.map((u) => (u.prev.length ? (
                <Link key={u.id} href={`/planner?to=${u.slug}`} className="text-xs text-accent underline">Materials to get {u.name}</Link>
              ) : <span key={u.id} className="text-xs text-muted">—</span>))}
            />
          </div>
        </div>
      )}
      <p className="text-xs text-muted">
        Highlighted: best value in each row (highest stats; fewest rank-ups, battles and VP). Routes use the path
        with the fewest battles from a Shop unit.
      </p>
    </div>
  );
}
