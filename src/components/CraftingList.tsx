"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { MaterialLite } from "@/lib/types";
import { MatChip } from "./ui";

export interface CraftRow {
  slug: string;
  result: string;
  type: "Weapons" | "Armor" | "Accessories";
  mold: string;
  ore: string;
  /** Resolved material names; null where the chart allows any jewel. */
  items: (string | null)[];
  effect: string;
  effectInfo: string;
  success: number;
}

const TYPES = ["Weapons", "Armor", "Accessories"] as const;

export default function CraftingList({
  rows,
  materials,
  typeIcons,
}: {
  rows: CraftRow[];
  materials: Record<string, MaterialLite>;
  typeIcons: Record<string, string | null>;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [mold, setMold] = useState("");
  const [ore, setOre] = useState("");
  const [effect, setEffect] = useState("");
  const [sort, setSort] = useState<"mold" | "success" | "name">("mold");
  const [flash, setFlash] = useState("");
  const dq = useDeferredValue(q);

  // Arriving with #item (e.g. from the navbar search): make sure that row is shown,
  // scroll to it and highlight it, even if filters were hiding it.
  useEffect(() => {
    const show = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id || !rows.some((r) => r.slug === id)) return;
      setQ(""); setType(""); setMold(""); setOre(""); setEffect("");
      setFlash(id);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" })),
      );
      window.setTimeout(() => setFlash((f) => (f === id ? "" : f)), 2500);
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, [rows]);

  const molds = useMemo(() => [...new Set(rows.filter((r) => !type || r.type === type).map((r) => r.mold))], [rows, type]);
  const ores = useMemo(
    () => [...new Set(rows.map((r) => r.ore))].sort((a, b) => (materials[a]?.order ?? 999) - (materials[b]?.order ?? 999)),
    [rows, materials],
  );
  const effects = useMemo(
    () => [...new Set(rows.flatMap((r) => r.effect.split(" + ")))].sort(),
    [rows],
  );

  const shown = useMemo(() => {
    const ql = dq.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (!type || r.type === type) &&
        (!mold || r.mold === mold) &&
        (!ore || r.ore === ore) &&
        (!effect || r.effect.split(" + ").includes(effect)) &&
        (!ql ||
          [r.result, r.mold, r.ore, r.effect, ...r.items.map((i) => i ?? "any jewel")]
            .join(" ")
            .toLowerCase()
            .includes(ql)),
    );
    if (sort === "success") out.sort((a, b) => b.success - a.success || a.result.localeCompare(b.result));
    if (sort === "name") out.sort((a, b) => a.result.localeCompare(b.result));
    return out;
  }, [rows, dq, type, mold, ore, effect, sort]);

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["", ...TYPES].map((t) => (
          <button
            key={t || "all"}
            onClick={() => { setType(t); setMold(""); }}
            className={`chip !px-3 !py-1 !text-sm ${type === t ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}
          >
            {t && typeIcons[t] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={typeIcons[t]!} alt="" width={18} height={18} className="pixel" />
            )}
            {t || "All"}
            <span className="font-mono text-xs opacity-70">{rows.filter((r) => !t || r.type === t).length}</span>
          </button>
        ))}
      </div>

      <div className="card mb-3 flex flex-wrap gap-2 p-3">
        <input className="ctl min-w-56 flex-1" placeholder="Search item, effect or ingredient…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ctl" value={mold} onChange={(e) => setMold(e.target.value)} aria-label="Mold">
          <option value="">Any mold</option>
          {molds.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="ctl" value={ore} onChange={(e) => setOre(e.target.value)} aria-label="Ore">
          <option value="">Any ore</option>
          {ores.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="ctl" value={effect} onChange={(e) => setEffect(e.target.value)} aria-label="Effect">
          <option value="">Any effect</option>
          {effects.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="ctl" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="mold">Sort: mold, ore</option>
          <option value="success">Sort: success %</option>
          <option value="name">Sort: name</option>
        </select>
      </div>

      <p className="mb-2 text-sm text-muted">{shown.length} of {rows.length} recipes</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-panel-2">
            <tr>
              <th className="th">Item</th>
              <th className="th">Mold</th>
              <th className="th">Ingredients</th>
              <th className="th">Effect</th>
              <th className="th text-right">Success</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.slug}
                id={r.slug}
                className={`scroll-mt-20 border-b border-line/60 transition-colors duration-700 last:border-0 hover:bg-panel-2/60 ${flash === r.slug ? "bg-accent/20" : ""}`}
              >
                <td className="td">
                  <div className="flex items-center gap-2 font-medium">
                    {typeIcons[r.type] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={typeIcons[r.type]!} alt="" width={20} height={20} className="pixel" />
                    )}
                    <span className="whitespace-nowrap">{r.result}</span>
                  </div>
                </td>
                <td className="td whitespace-nowrap text-muted">{r.mold}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    <MatChip name={r.ore} m={materials[r.ore]} />
                    {r.items.map((n, i) =>
                      n ? <MatChip key={i} name={n} m={materials[n]} /> : <span key={i} className="chip text-muted">Any jewel</span>,
                    )}
                  </div>
                </td>
                <td className="td">
                  <div>{r.effect}</div>
                  {r.effectInfo && <div className="max-w-md text-xs text-muted">{r.effectInfo}</div>}
                </td>
                <td className="td text-right font-mono font-semibold">{r.success}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
