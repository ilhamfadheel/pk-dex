"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Edge, PlannerData } from "@/lib/types";
import {
  RANKUP_MOLD,
  battles,
  cheapestRecipe,
  findPaths,
  pathsFromBases,
  totals,
  vpNeeded,
} from "@/lib/plan";
import { MatIcon, RecipeOptions, UnitImg } from "./ui";

export default function RankupPlanner({
  data,
  initialFrom,
  initialTo,
  lockTarget = false,
  onChange,
}: {
  data: PlannerData;
  initialFrom: number | null; // null = any base unit
  initialTo: number;
  lockTarget?: boolean;
  onChange?: (from: number | null, to: number) => void;
}) {
  const [from, setFrom] = useState<number | null>(initialFrom);
  const [to, setTo] = useState<number>(initialTo);
  const [pathIdx, setPathIdx] = useState(0);
  const [choice, setChoice] = useState<Record<string, number>>({});
  const [withFails, setWithFails] = useState(false);

  const unit = (id: number) => data.units.find((u) => u.id === id)!;
  const sortedUnits = useMemo(
    () => [...data.units].sort((a, b) => a.id - b.id), // the game's unit order
    [data.units],
  );
  // Ancestors of `to`, so the "from" dropdown only offers reachable units.
  const ancestors = useMemo(() => {
    const s = new Set<number>();
    const stack = [to];
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of data.edges) if (e.to === id && !s.has(e.from)) { s.add(e.from); stack.push(e.from); }
    }
    return s;
  }, [data.edges, to]);

  const paths = useMemo(
    () => (from == null ? pathsFromBases(data, to) : findPaths(data.edges, from, to)),
    [data, from, to],
  );
  const path: Edge[] = useMemo(() => paths[Math.min(pathIdx, paths.length - 1)] ?? [], [paths, pathIdx]);
  const tot = useMemo(() => totals(data, path, choice), [data, path, choice]);

  const update = (f: number | null, t: number) => {
    setFrom(f); setTo(t); setPathIdx(0);
    onChange?.(f, t);
  };

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <label className="text-xs text-muted">
          Start from
          <select className="ctl mt-1 block min-w-48" value={from ?? ""}
            onChange={(e) => update(e.target.value === "" ? null : +e.target.value, to)}>
            <option value="">Any base unit</option>
            {sortedUnits.filter((u) => ancestors.has(u.id)).map((u) => (
              <option key={u.id} value={u.id}>{u.name} (R{u.rank})</option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-muted">→</span>
        <label className="text-xs text-muted">
          Target unit
          <select className="ctl mt-1 block min-w-48" value={to} disabled={lockTarget}
            onChange={(e) => {
              const t = +e.target.value;
              update(from != null && from !== t ? from : null, t);
            }}>
            {sortedUnits.filter((u) => u.prev.length > 0).map((u) => (
              <option key={u.id} value={u.id}>{u.name} (R{u.rank})</option>
            ))}
          </select>
        </label>
        <label className="ml-auto flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={withFails} onChange={(e) => setWithFails(e.target.checked)} className="accent-[var(--accent)]" />
          Budget for failed combines
        </label>
      </div>

      {paths.length === 0 ? (
        <p className="card p-4 text-sm text-muted">
          No rank-up path from {from == null ? "a base unit" : unit(from).name} to {unit(to).name}.
          {data.units.find((u) => u.id === to)?.prev.length === 0 && " This is a base unit (recruit it directly)."}
        </p>
      ) : (
        <>
          {paths.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {paths.map((p, i) => (
                <button key={i} onClick={() => setPathIdx(i)}
                  className={`chip !py-1 ${i === pathIdx ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}>
                  Path {i + 1}: {[p[0].from, ...p.map((e) => e.to)].map((id) => unit(id).name).join(" → ")}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            {/* Steps */}
            <ol className="space-y-2">
              {path.map((e, i) => {
                const rs = data.emblems[e.emblem] ?? [];
                const ci = choice[e.emblem] ?? cheapestRecipe(data, e.emblem);
                const r = rs[ci];
                return (
                  <li key={i} className="card p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-panel-2 font-mono text-xs">{i + 1}</span>
                      <Link href={`/unit/${unit(e.from).slug}`} className="flex items-center gap-2 hover:text-accent">
                        <UnitImg u={unit(e.from)} size={40} /> <span className="font-medium">{unit(e.from).name}</span>
                      </Link>
                      <span className="text-muted">→</span>
                      <Link href={`/unit/${unit(e.to).slug}`} className="flex items-center gap-2 hover:text-accent">
                        <UnitImg u={unit(e.to)} size={40} /> <span className="font-medium">{unit(e.to).name}</span>
                      </Link>
                      <div className="ml-auto flex flex-wrap gap-1 text-xs">
                        <span className="chip">Rank {e.rank}</span>
                        <span className="chip">Lv {e.level}</span>
                        <span className="chip">{e.vp} VP</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/emblems#${encodeURIComponent(e.emblem)}`} className="flex items-center gap-1.5 font-semibold text-gold hover:underline">
                          <MatIcon m={data.materials[RANKUP_MOLD]} size={20} /> {e.emblem}
                        </Link>
                        <span className="text-xs text-muted">
                          {rs.length > 1 ? `${rs.length} ways to make it. Tap the jewel you have; totals update.` : "1 way to make it"}
                        </span>
                      </div>
                      <RecipeOptions
                        recipes={rs}
                        materials={data.materials}
                        selected={ci}
                        onSelect={(j) => setChoice((c) => ({ ...c, [e.emblem]: j }))}
                      />
                      {r && <div className="text-xs text-muted">Using: {r.ore} + {r.item1} + {r.item2} + {RANKUP_MOLD}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Totals */}
            <aside className="card h-fit p-4 lg:sticky lg:top-16">
              <h3 className="mb-3 font-semibold">Total needed</h3>
              <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-panel-2 p-2"><dt className="text-[10px] uppercase text-muted">Rank-ups</dt><dd className="font-mono text-lg font-semibold">{path.length}</dd></div>
                <div className="rounded-lg bg-panel-2 p-2"><dt className="text-[10px] uppercase text-muted">Battles</dt><dd className="font-mono text-lg font-semibold">{battles(path)}</dd></div>
                <div className="rounded-lg bg-panel-2 p-2"><dt className="text-[10px] uppercase text-muted">Kingdom VP</dt><dd className="font-mono text-lg font-semibold">{vpNeeded(path)}</dd></div>
              </dl>
              <ul className="space-y-1.5">
                {tot.map((t) => {
                  const m = data.materials[t.name];
                  const n = withFails ? Math.ceil(t.expected) : t.count;
                  return (
                    <li key={t.name} className="flex items-center gap-2 text-sm">
                      <MatIcon m={m} size={24} />
                      {m && m.slug !== "rankup-mold" ? (
                        <Link href={`/materials/${m.slug}`} className="hover:text-accent">{t.name}</Link>
                      ) : <span>{t.name}</span>}
                      <span className="text-[10px] text-muted">{m?.category}</span>
                      <span className="ml-auto font-mono font-semibold text-accent">×{n}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 border-t border-line pt-2 text-[11px] leading-snug text-muted">
                Each rank-up consumes one emblem. Units reset to level 0 after ranking up and gain one
                level per battle. VP is a kingdom total you must have, not spend.
                {withFails && " Counts include the expected extra combines from the success rate."}
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
